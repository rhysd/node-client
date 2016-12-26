import {attach} from '..';
import {spawn} from 'child_process';

async function run() {
    const proc = spawn('nvim', ['-u', 'NONE', '-N', '--embed'], {cwd: __dirname });

    const nvim = await attach(proc.stdin, proc.stdout);
    await nvim.uiAttach(80, 24, {rgb: false});

    const v = await nvim.getVersion();
    console.log('Version:', v);

    await nvim.command('vsp');
    const wins = await nvim.listWins();
    await nvim.setCurrentWin(wins[1]);
    const win = await nvim.getCurrentWin();
    console.log('Current window:', win);

    let lines: string[];
    const buf = await nvim.getCurrentBuf();
    lines = await buf.getLineSlice(0, -1, true, true);
    console.log('Before lines:', lines);
    await buf.setLineSlice(0, -1, true, true, ['line1', 'line2']);
    lines = await buf.getLineSlice(0, -1, true, true);
    console.log('After lines:', lines);
    await nvim.quit();
}

run().then(() => console.log('Done!'));

