/** Original, fictional training encounters. Actions affect only the local game. */
export const BOSSES = Object.freeze([
  {
    id: 'PrinterThatCannotBeFound', at: 30, techSkill: 8, patience: 26,
    title: 'The Printer That Cannot Be Found',
    entrance: 'The curtains part. A printer has entered witness protection. Two faults. One spectacularly unhelpful display.',
    defeat: 'Address corrected. Driver matched. The beast produces one entirely ordinary sheet of paper. Thunderous applause.',
    stages: [
      {
        id: 'printer-address', category: 'BOSS · NETWORK PRINTING', title: 'The Printer That Cannot Be Found',
        quote: 'I am online, reachable, and absolutely nowhere your print queue expects me.',
        clue: 'The printer configuration report and DHCP reservation both show 10.20.4.87. DNS already resolves correctly. The shared queue still uses a TCP/IP port at the obsolete 10.20.4.44.',
        user: 'The Vanishing Printer · Technical skill 8/10', icon: '🖨️',
        actions: [
          { label: 'Point the queue port at the verified reserved IP', kind: 'fix', outcome: 'The queue reaches the correct printer. A driver error emerges from behind the curtain.' },
          { label: 'Flush DNS on every laptop', kind: 'wrong', outcome: 'DNS already had the right address. The print queue is still calling the old one.' },
          { label: 'Reinstall the same queue without changing its port', kind: 'wrong', outcome: 'A brand-new installation of the exact same wrong address. Magnificent consistency.' },
        ],
      },
      {
        id: 'printer-driver', category: 'BOSS · DRIVER DIAGNOSIS', title: 'The Printer: final paper jam',
        quote: 'You found my address. Now kindly speak a language I understand.',
        clue: 'The corrected port reaches this PCL-only model. Its queue is configured with a PostScript driver, and test jobs produce an unsupported-language error. An approved PCL6 driver for this model is available.',
        user: 'The Vanishing Printer · Technical skill 8/10', icon: '🖨️',
        actions: [
          { label: 'Use the approved PCL6 driver and verify a test print', kind: 'fix', outcome: 'The driver speaks PCL6. The test page prints. An actual fix, with supporting paperwork.' },
          { label: 'Resend the same PostScript job', kind: 'wrong', outcome: 'The printer declines the same language for the same reason, now with artistic conviction.' },
          { label: 'Add more paper to the full tray', kind: 'wrong', outcome: 'Ample paper. Incompatible print language. The tray cannot translate.' },
        ],
      },
    ],
  },
  {
    id: 'Friday4:59ChangeRequest', at: 60, techSkill: 2, patience: 26,
    title: 'The Friday 4:59 Change Request',
    entrance: 'Behold: a change request wearing a tiny emergency crown. It demands production. You demand a rollback plan.',
    defeat: 'The failed canary is rolled back, service is verified healthy, and the change returns to testing. The weekend receives a stay of execution.',
    stages: [
      {
        id: 'friday-rollback', category: 'BOSS · CHANGE SAFETY', title: 'The Friday 4:59 Change Request',
        quote: 'It is one tiny database change. How many dependencies can one column possibly have?',
        clue: 'This fictional release drops a database column that the current app still reads. A rollback would restore that app but not the dropped data. The staging copy confirms the dependency.',
        user: 'The Deadline Duke · Technical skill 2/10', icon: '🚨',
        actions: [
          { label: 'Keep the column; test a backward-compatible migration and rollback', kind: 'fix', outcome: 'The staged migration preserves the column and the old app still works. The rollback is tested before the canary begins.' },
          { label: 'Ship the drop and promise to roll the app back', kind: 'wrong', outcome: 'An app rollback cannot conjure a deleted column or its data. The emergency crown is made of cardboard.' },
          { label: 'Disable database alerts for the release', kind: 'wrong', outcome: 'Silencing the orchestra does not repair the trapdoor. The rollback remains broken.' },
        ],
      },
      {
        id: 'friday-canary', category: 'BOSS · CANARY RECOVERY', title: 'The Change Request: red canary',
        quote: 'Five percent of customers is practically no customers. Can we call this green?',
        clue: 'The backward-compatible migration passed. The 5% canary now returns HTTP 500 because a required environment variable is missing. The previous app is healthy, the rollback was tested, and the release gate requires stopping on errors.',
        user: 'The Deadline Duke · Technical skill 2/10', icon: '🚨',
        actions: [
          { label: 'Roll back the canary, verify health, and retest corrected config', kind: 'fix', outcome: 'Traffic returns to the healthy version; error rates recover. The missing configuration goes back through testing before any new rollout.' },
          { label: 'Roll out to 100% so every instance matches', kind: 'wrong', outcome: 'Uniform failure is still failure. The tiny emergency crown has become a very large outage.' },
          { label: 'Increase the timeout without fixing the missing variable', kind: 'wrong', outcome: 'A longer timeout cannot supply a missing configuration value. The canary remains decidedly red.' },
        ],
      },
    ],
  },
]);
