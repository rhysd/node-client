import {attach} from '..';
import {spawn} from 'child_process';

const proc = spawn('nvim', ['-u', 'NONE', '-N', '--embed'], {cwd: __dirname });
attach(proc.stdin, proc.stdout).then(nvim => {
    nvim.uiAttach(80, 24, {rgb: false}).then(
        () => nvim.getVersion()
    ).then(
        v => console.log(v)
    ).then(
        () => nvim.command('vsp')
    ).then(
        () => nvim.listWins()
    ).then(
        windows => nvim.setCurrentWin(windows[1])
    ).then(
        () => nvim.getCurrentWin()
    ).then(win => {
        console.log(win);
        return nvim.getCurrentBuf();
    }).then(
        buf => buf.getLineSlice(0, -1, true, true).then(lines => {
            console.log(lines);
            return buf.setLineSlice(0, -1, true, true, ['line1', 'line2']);
        }).then(
            () => buf.getLineSlice(0, -1, true, true)
        ).then(lines => {
            console.log(lines);
            nvim.quit();
        })
    );
});

