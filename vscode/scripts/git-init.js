const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..');

async function initGitRepo() {
    console.log('Initializing Git repository at:', dir);
    
    // 1. Init git repo
    await git.init({ fs, dir });

    // 2. Add source and project files
    const files = [
        'package.json',
        'tsconfig.json',
        'README.md',
        'LICENSE',
        '.gitignore',
        'icon.png',
        'src/extension.ts',
        'src/formatter/config.ts',
        'src/formatter/javaFormatter.ts',
        'src/formatter/organizeImports.ts',
        'src/providers/javaFormattingProvider.ts',
        'src/providers/codeActionProvider.ts',
        'src/test/runTest.ts',
        'src/test/suite/formatter.test.ts',
        'src/test/suite/extension.e2e.test.ts'
    ];

    for (const filepath of files) {
        const fullPath = path.join(dir, filepath);
        if (fs.existsSync(fullPath)) {
            await git.add({ fs, dir, filepath });
        }
    }

    // 3. Create Initial Commit
    const sha = await git.commit({
        fs,
        dir,
        author: {
            name: 'Accenture Developer',
            email: 'dev@accenture.com'
        },
        message: 'Initial commit: Accenture Java Formatter v1.0.0 with 2-space default indentation and format-on-change support'
    });

    console.log('Git repository initialized successfully! Commit SHA:', sha);
}

initGitRepo().catch(console.error);
