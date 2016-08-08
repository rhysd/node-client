/* jshint loopfunc: true, evil: true */
const util = require('util');
const EventEmitter = require('events').EventEmitter;

const Session = require('msgpack5rpc');
const _ = require('lodash');
const traverse = require('traverse');

function Nvim(session, channel_id) {
    this._session = session;
    this._decode = decode;
    this._channel_id = channel_id;
}
util.inherits(Nvim, EventEmitter);

function decode(obj) {
    traverse(obj).forEach(function(item) {
        if (item instanceof Session) {
            this.update(item, true);
        } else if (Buffer.isBuffer(item)) {
            try { this.update(item.toString('utf8')); } catch (e) {}
        }
    });

    return obj;
}

function equals(other) {
    try {
        return this._data.toString() === other._data.toString();
    } catch (e) {
        return false;
    }
}

function generateWrappers(Nvim, types, metadata) {
    for (let i = 0; i < metadata.functions.length; i++) {
        const func = metadata.functions[i];
        const parts = func.name.split('_');
        const typeName = _.capitalize(parts[0]);
        // The type name is the word before the first dash capitalized. If the type
        // is Vim, then it a editor-global method which will be attached to the Nvim
        // class.
        const methodName = _.camelCase(parts.slice(1).join('_'));
        let args = func.parameters.map(p => p[1]);
        let Type, callArgs;
        if (typeName === 'Vim' || typeName === 'Ui') {
            Type = Nvim;
            callArgs = args.join(', ');
        } else {
            Type = types[typeName];
            args = args.slice(1);
            // This is a method of one of the ext types, prepend "this" to the call
            // arguments.
            callArgs = ['this'].concat(args).join(', ');
        }
        args.push('notify');
        const params = args.join(', ');
        // XXX:
        // Using string constructor because `notify` argument can't be distinguished
        // if `...args` or `arguments` used.  They need if using anonymous function.
        const method = new Function(
                'return function ' + methodName + '(' + params + ') {' +
                '\n  if (notify) {' +
                '\n    this._session.notify("' + func.name + '", [' + callArgs + ']);' +
                '\n    return;' +
                '\n  }' +
                '\n  return new Promise((resolve, reject) => {' +
                '\n    this._session.request("' + func.name + '", [' + callArgs + '], (err, res) => {' +
                '\n     if (err) return reject(new Error(err[1]));' +
                '\n     resolve(this._decode(res));' +
                '\n   });' +
                '\n  });' +
                '\n};'
            )();
        const paramTypes = func.parameters.map(p => p[0]);
        paramTypes.push('boolean');
        method.metadata = {
            name: methodName,
            deferred: func.deferred,
            returnType: func.return_type,
            parameters: args,
            parameterTypes: paramTypes,
            canFail: func.can_fail,
        };
        if (typeName !== 'Vim') {
            method.metadata.parameterTypes.shift();
        }
        Type.prototype[methodName] = method;
    }
}

function addExtraNvimMethods(Nvim) {
    Nvim.prototype.uiAttach = function uiAttach(width, height, rgb, cb) {
        if (cb) {
            this._session.request('ui_attach', [width, height, rgb], cb);
        } else {
            this._session.notify('ui_attach', [width, height, rgb]);
        }
    };

    Nvim.prototype.uiDetach = function uiDetach(cb) {
        if (cb) {
            this._session.request('ui_detach', [], cb);
        } else {
            this._session.notify('ui_detach', []);
        }
    };

    Nvim.prototype.uiTryResize = function uiTryResize(width, height, cb) {
        if (cb) {
            this._session.request('ui_try_resize', [width, height], cb);
        } else {
            this._session.notify('ui_try_resize', [width, height]);
        }
    };

    Nvim.prototype.quit = function quit() {
        this.command('qa!', []);
    };
}

// Note: Use callback because it may be called more than once.
module.exports.attach = function(writer, reader) {
    let session = new Session([]);
    let calledCallback = false;
    let nvim = new Nvim(session);
    const initSession = session;
    const pendingRPCs = [];

    session.attach(writer, reader);

    return new Promise(function(resolve, reject){
        // register initial RPC handlers to queue non-specs requests until api is generated
        session.on('request', function(method, args, resp) {
            if (method !== 'specs') {
                pendingRPCs.push({
                    type: 'request',
                    args: Array.prototype.slice.call(arguments)
                });
            } else {
                resolve(nvim); // the errback may be called later, but 'specs' must be handled
                calledCallback = true;
                nvim.emit('request', decode(method), decode(args), resp);
            }
        });

        session.on('notification', function(method, args) {
            pendingRPCs.push({
                type: 'notification',
                args: Array.prototype.slice.call( arguments )
            });
        });

        session.on('detach', function() {
            session.removeAllListeners('request');
            session.removeAllListeners('notification');
            nvim.emit('disconnect');
        });

        session.request('vim_get_api_info', [], function(err, res) {
            if (err) {
                return reject(err);
            }

            const channel_id = res[0];

            const metadata = decode(res[1]);
            const extTypes = [];
            const types = {};

            Object.keys(metadata.types).forEach(function(name) {
                // Generate a constructor function for each type in metadata.types
                const Type = function(session, data, decode) {
                    this._session = session;
                    this._data = data;
                    this._decode = decode;
                };
                Object.defineProperty(Type, 'name', {value: name});
                Type.prototype.equals = equals;

                // Collect the type information necessary for msgpack5 deserialization
                // when it encounters the corresponding ext code.
                extTypes.push({
                    constructor: Type,
                    code: metadata.types[name].id,
                    decode: function(data) { return new Type(session, data, decode); },
                    encode: function(obj) { return obj._data; }
                });

                types[name] = Type;
                Nvim.prototype[name] = Type;
            });

            generateWrappers(Nvim, types, metadata);
            addExtraNvimMethods(Nvim);
            session = new Session(extTypes);
            session.attach(writer, reader);

            nvim = new Nvim(session, channel_id);

            // register the non-queueing handlers
            session.on('request', function(method, args, resp) {
                nvim.emit('request', decode(method), decode(args), resp);
            });

            session.on('notification', function(method, args) {
                nvim.emit('notification', decode(method), decode(args));
            });

            session.on('detach', function() {
                session.removeAllListeners('request');
                session.removeAllListeners('notification');
                nvim.emit('disconnect');
            });

            resolve(nvim);

            // dequeue any pending RPCs
            initSession.detach();
            pendingRPCs.forEach(function(pending) {
                if(pending.type === 'request') {
                    // there's no clean way to change the output channel using the current
                    // Session abstraction
                    pending.args[pending.args.length - 1]._encoder = session._encoder;
                }
                nvim.emit.apply(nvim, [].concat(pending.type, pending.args));
            });
        });
    });
};
