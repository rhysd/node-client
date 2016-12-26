'use strict';

const assert = require('assert');
const cp = require('child_process');
const which = require('which');
const attach = require('..').attach;

for (let k in assert) {
    global[k] = assert[k];
}

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

describe('Nvim', () => {
    let proc, nvim, requests, notifications;

    before(() => {
        proc = spawnNvim();

        return attach(proc.stdin, proc.stdout).then(n => {
            nvim = n;
            nvim.on('request', (method, args, resp) => {
                requests.push({method: method, args: args});
                resp.send('received ' + method + '(' + args + ')');
            });
            nvim.on('notification', (method, args) => {
                notifications.push({method: method, args: args});
            });
        });
    });

    beforeEach(() => {
        requests = [];
        notifications = [];
    });

    after(done => {
        nvim.on('disconnect', done);
        nvim.quit();
    });

    it('can send requests and receive response', () => {
        return nvim.eval('{"k1": "v1", "k2": 2}').then(res => {
            deepEqual(res, {k1: 'v1', k2: 2});
        });
    });

    it('can receive requests and send responses', () => {
        return nvim.eval('rpcrequest(1, "request", 1, 2, 3)').then(res => {
            strictEqual(res, 'received request(1,2,3)');
            deepEqual(requests, [{method: 'request', args: [1, 2, 3]}]);
            deepEqual(notifications, []);
        });
    });

    it('can receive notifications', done => {
        nvim.eval('rpcnotify(1, "notify", 1, 2, 3)').then(res => {
            strictEqual(res, 1);
            deepEqual(requests, []);
            setImmediate(() => {
                deepEqual(notifications, [{method: 'notify', args: [1, 2, 3]}]);
                done();
            });
        }).catch(err => done(err));
    });

    it('can deal with custom types', () => {
        return nvim.command('vsp')
            .then(res => nvim.listWins())
            .then(windows => {
                strictEqual(windows.length, 2);
                ok(windows[0] instanceof nvim.Window);
                ok(windows[1] instanceof nvim.Window);
                return nvim.setCurrentWin(windows[1])
                    .then(() => nvim.getCurrentWin())
                    .then(win => {
                        ok(win.equals(windows[1]));
                        return nvim.getCurrentBuf();
                    }).then(buf => {
                        ok(buf instanceof nvim.Buffer);
                        return buf.getLineSlice(0, -1, true, true)
                            .then(lines => {
                                deepEqual(lines, ['']);
                                return buf.setLineSlice(0, -1, true, true, ['line1', 'line2']);
                            })
                            .then(() => buf.getLineSlice(0, -1, true, true))
                            .then(lines => {
                                deepEqual(lines, ['line1', 'line2']);
                            });
                    });
            });
    });

    it('can call APIs while UI attaching', () => {
        return nvim.uiAttach(80, 24, {rgb: false})
            .then(nvim.listWins())
            .then(() => nvim.uiTryResize(160, 48))
            .then(() => nvim.uiDetach());
    });

    it('accepts "notify" to control to send notification or request', () => {
        strictEqual(nvim.command('vsp', true), undefined);
        return nvim.listWins(false).then(res => {
            ok(res.length > 0);
        });
    });

    it('emits "disconnect" event when original process is killed', done => {
        const p = spawnNvim();
        strictEqual(p.exitCode, null);

        attach(p.stdin, p.stdout).then(n => {
            n.once('disconnect', done);
            p.kill();
        });
    });

    it('quits nvim on calling quit() method', done => {
        const p = spawnNvim();
        strictEqual(p.exitCode, null);
        attach(p.stdin, p.stdout)
            .then(n => {
                p.on('exit', done);
                n.quit();
            });
    });

    it('shows the version with getVersion() method', () => {
        return nvim.getVersion().then(v => {
            ok(v.major >= 0);
            ok(v.minor >= 2);
            ok(v.patch >= 0);
        });
    });
});
