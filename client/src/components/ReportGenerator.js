// client/src/components/ReportGenerator.js

export function generateReport(accountData) {
    let reportContent = `====================================================\n`;
    reportContent += `🕵️ FINANCIAL FORENSICS ANALYST REPORT\n`;
    reportContent += `Generated: ${new Date().toLocaleString()}\n`;
    reportContent += `====================================================\n\n`;

    reportContent += `[ ACCOUNT DOSSIER ]\n`;
    reportContent += `Target Account ID: ${accountData.account_id}\n`;
    reportContent += `Current Analyst Status: ${accountData.analyst_status}\n`;

    // Recommended action logic
    let action = "MONITOR";
    if (accountData.analyst_status === 'Confirmed Fraud') action = "FREEZE IMMEDIATELY (Already Confirmed)";
    else if (accountData.risk_score > 80) action = "FREEZE AND ESCALATE";
    else if (accountData.risk_score > 50) action = "UNDER REVIEW (HIGH RISK)";
    else if (accountData.analyst_status === 'Cleared') action = "CLEARED - NO ACTION";

    reportContent += `Recommended Action: ${action}\n`;
    if (accountData.notes) {
        reportContent += `Analyst Notes: "${accountData.notes}"\n`;
    }
    reportContent += `\n`;

    reportContent += `[ RISK METRICS ]\n`;
    reportContent += `Total Risk Score: ${accountData.risk_score}/100\n`;
    if (accountData.distanceFromRiskSource > 0) {
        reportContent += `Proximity Hops to Known Fraud: ${accountData.distanceFromRiskSource}\n`;
    }
    reportContent += `\n`;

    reportContent += `[ ALGORITHMIC FLAGS ]\n`;
    accountData.explanations.forEach(flag => {
        reportContent += ` - ${flag}\n`;
    });
    reportContent += `\n`;

    reportContent += `[ TRANSACTION VOLUME SUMMARY ]\n`;
    reportContent += `Total Inflow: $${accountData.stats.total_inflow.toFixed(2)}\n`;
    reportContent += `Total Outflow: $${accountData.stats.total_outflow.toFixed(2)}\n`;
    reportContent += `Total Connected Counterparties: ${accountData.counterparties.length}\n`;
    reportContent += `\n`;

    reportContent += `[ TRANSACTION LEDGER ]\n`;
    reportContent += `TYPE | AMOUNT       | COUNTERPARTY       | TIMESTAMP\n`;
    reportContent += `--------------------------------------------------------\n`;
    accountData.history.forEach(tx => {
        const typeStr = tx.type.padEnd(4, ' ');
        const amtStr = `$${tx.amount.toFixed(2)}`.padEnd(12, ' ');
        const cpStr = tx.counterparty.padEnd(18, ' ');
        const tsStr = new Date(tx.timestamp).toLocaleString();
        reportContent += `${typeStr} | ${amtStr} | ${cpStr} | ${tsStr}\n`;
    });

    reportContent += `\n================== END OF REPORT ==================\n`;

    // Trigger download
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Forensics_Report_${accountData.account_id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
