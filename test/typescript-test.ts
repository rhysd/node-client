import {attach} from '..';
import {spawn} from 'child_process';

const proc = spawn('nvim', ['-u', 'NONE', '-N', '--embed'], {cwd: __dirname });
attach(proc.stdin, proc.stdout).then(nvim => {
    nvim.uiAttach(80, 24, false).then(
        () => nvim.getVersion()
    ).then(
        v => console.log(v)
    ).then(
        () => nvim.command('vsp')
    ).then(
        () => nvim.getWindows()
    ).then(
        windows => nvim.setCurrentWindow(windows[1])
    ).then(
        () => nvim.getCurrentWindow()
    ).then(win => {
        console.log(win);
        return nvim.getCurrentBuffer();
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

