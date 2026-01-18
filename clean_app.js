const fs = require('fs');
const path = './App.tsx';

try {
    const data = fs.readFileSync(path, 'utf8');
    let lines = data.split(/\r?\n/);

    // Verify content before deleting (1-based lines 906 and 950 correspond to indices 905 and 949)
    const lineStart = lines[905]; // Line 906
    const lineEnd = lines[949];   // Line 950

    console.log('Checking Line 906:', lineStart);
    console.log('Checking Line 950:', lineEnd);

    if (lineStart && lineStart.includes('const handleDeleteInvestment') && lineEnd && lineEnd.includes('=======')) {
        console.log('Verification passed. Deleting lines 906-950...');
        lines.splice(905, 45);
        fs.writeFileSync(path, lines.join('\n'));
        console.log('File updated successfully.');
    } else {
        console.error('Verification FAILED. Lines do not match expected content.');
        // Debug nearby lines if failed
        console.log('Line 900:', lines[899]);
        console.log('Line 955:', lines[954]);
        process.exit(1);
    }
} catch (e) {
    console.error('Error:', e);
    process.exit(1);
}
