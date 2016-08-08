var assert = require('assert');
var cp = require('child_process');
var which = require('which');
var attach = require('..').attach;

for (var k in assert) global[k] = assert[k];

try {
    which.sync('nvim');
} catch (e) {
    console.error('A Neovim installation is required to run the tests',
            '(see https://github.com/neovim/neovim/wiki/Installing)');
    process.exit(1);
}

function spawnNvim() {
    return cp.spawn('nvim', ['-u', 'NONE', '-N', '--embed'], {cwd: __dirname });
}

describe('Nvim', function() {
    var nvim, requests, notifications;

    before(function(done) {
        nvim = spawnNvim();

        attach(nvim.stdin, nvim.stdout).then(function(n){
            nvim = n;
            nvim.on('request', function(method, args, resp) {
                requests.push({method: method, args: args});
                resp.send('received ' + method + '(' + args + ')');
            });
            nvim.on('notification', function(method, args) {
                notifications.push({method: method, args: args});
            });
            done();
        });
    });

    beforeEach(function() {
        requests = [];
        notifications = [];
    });

    after(function(done) {
        nvim.on('disconnect', done);
        nvim.quit();
    });

    it('can send requests and receive response', function(done) {
        nvim.eval('{"k1": "v1", "k2": 2}').then(function(res) {
            deepEqual(res, {k1: 'v1', k2: 2});
            done();
        }).catch(function(err){
            throw err;
        });
    });

    it('can receive requests and send responses', function(done) {
        nvim.eval('rpcrequest(1, "request", 1, 2, 3)').then(function(res) {
            equal(res, 'received request(1,2,3)');
            deepEqual(requests, [{method: 'request', args: [1, 2, 3]}]);
            deepEqual(notifications, []);
            done();
        }).catch(function(err){
            throw err;
        });
    });

    it('can receive notifications', function(done) {
        nvim.eval('rpcnotify(1, "notify", 1, 2, 3)').then(function(res) {
            equal(res, 1);
            deepEqual(requests, []);
            setImmediate(function() {
                deepEqual(notifications, [{method: 'notify', args: [1, 2, 3]}]);
                done();
            });
        });
    });

    it('can deal with custom types', function(done) {
        nvim.command('vsp').then(function(res){
            return nvim.getWindows();
        }).then(function(windows){
            equal(windows.length, 2);
            equal(windows[0] instanceof nvim.Window, true);
            equal(windows[1] instanceof nvim.Window, true);
            return nvim.setCurrentWindow(windows[1]).then(function(){
                return nvim.getCurrentWindow();
            }).then(function(win){
                equal(win.equals(windows[1]), true);
                return nvim.getCurrentBuffer();
            }).then(function(buf){
                equal(buf instanceof nvim.Buffer, true);
                return buf.getLineSlice(0, -1, true, true).then(function(lines){
                    deepEqual(lines, ['']);
                    return buf.setLineSlice(0, -1, true, true, ['line1', 'line2']);
                }).then(function(){
                    return buf.getLineSlice(0, -1, true, true);
                }).then(function(lines){
                    deepEqual(lines, ['line1', 'line2']);
                    done();
                });
            });
        }).catch(function(err){
            done(err);
        });
    });

    it('can call APIs while UI attaching', function(done) {
        nvim.uiAttach(80, 24, false).then(function(){
            return nvim.getWindows();
        }).then(function(){
            return nvim.uiTryResize(160, 48);
        }).then(function(){
            return nvim.uiDetach();
        })
        .catch(function(err){ done(err); })
        .then(function(){ done(); });
    });

    it('accepts "notify" to control to send notification or request', function(done) {
        equal(nvim.command('vsp', true), undefined);
        nvim.getWindows(false).then(function(res) {
            ok(res.length > 0);
            done();
        }).catch(function(err) {
            done(err);
        });
    });
});
