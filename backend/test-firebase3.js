const admin = require('firebase-admin');

const sa = {
    projectId: 'internshala-clone-6c9f0',
    clientEmail: 'firebase-adminsdk-fbsvc@internshala-clone-6c9f0.iam.gserviceaccount.com',
    privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDoOYi6fqtmnX/N
7ZAWp63PhinuirCBxj421pleoCA2ipNV6/WCJme8EGir8bcmr8KA6cMgvV8LfZvx
G0qs3zM+IXmJDNFSI5j374TbvgbTQ0/2S5PgIn49w7nmSXCsGUt8bRAXKrewEISy
xZnn5cFceDBi8PiV3D6YNny90omrT4KLuW2RskU/gc7f16Fa1yQxWxultOThIzkZ
4yxdKTo4bbdoYoXUf3IP6eSLVBDuo12pA1h2zjNyCY/kHoEhwS7T6na1xLygpxoo
6gmSh0hP3o/wGTG9tZ5A4Ja7lAmc7xOSjkM9YV/YwAezniHV5AXpebOFczoP6SQl
7WmkKHKJAgMBAAECggEAAUN2NZI6CK9Q3PQO3Y9bgCkkzMNh6vmDE1Akb6dI4usV
mqPTnI9CGhFFHzG2k1C6VZ0P/qYGdfJLboAoGPEySZir3TLzPPJseGWL+u3ELT2X
mjQ2kYNhMvZVP7DExWxHeh2WIb4jLON7dAU5uBE1YGACCWPHbSSl4t+hsEm3OItN
9/4tuxc4DVlCllJDtGjx0tC9113VHOr7tQ+ATW2e/ruWPXj99NtWClE2tm4dU9pv
Rh+4ZhGlBsmekq5qfDFDcM1iosv/QRr9bxAi5BpHmowlcoSZVvW7q3+mX61k2WRp
JzslfCxiR2OFZ1bfIYd+VSd5uHPZ2yRB5UBp9yqZ5QKBgQD2tclm5e0v3vJzO2bN
WtKwnZZfxvtKMYNiT1q71mxjWv3Pvur5DzHDO9JQPlIRJkU3kOz5KrLFeUIFLPFb
sQUOQEHrj35K2zdbYmzIyRToSNjuZTGTl1qratv0goSfahtXIlLy/BVmSJqXz+Rt
Z4+bVBTf/s4AKkAmA3iP6PDiBQKBgQDw+Bza+7wgZYpwOWWfKs5hM/+cYhmkMsGN
LCQHSAix/y47+bU5AHEdVrES+JijX3tuve6hf2hbxfD7g1Bxwv+EQuWr3SF+j3oB
3P5kkkiHCgNr0dOO6VbY0wlU/ZRU38etnoCOyLg8fkgqh9AZ+AWp1Zs9O3OHFE26
0pq+ob4htQKBgGIMcVShwJgr5PODAiJPHDjxCFhcPnaIIw0pOIg6ea0q9oBgAgal
0UMkPTuC6R7DtPKWeHe2ToJI5MIl0G5+deHqC8jQqIKbiO6auV06/UIr4XstYHyl
xHUn7O7KCGdKxj7k9052fRK/fCElkEUiyWIUEo/LNpe+MuxoqLuY+lL5AoGAFBzB
W82zEAkpmuBPiQ9rllVeulC9zySlXwEWKL1sbF7eHwdihtVwm4BG20yAgPJRPRcB
Od2GelJ1IKj/J9+csA9dWBDm4Mdc6ZbmbMKA5zSAwJkMzVrQctx6ZOudW9ApvGYE
WOaL6hCoOVSInAJFhr1bbaruo5GgQz2cyNh7JBkCgYEA4R6Yaht86VcJEKHzbJA4
AFzlA9Um31d63aupXvS8imUw3p9RbrFJR5lu1VeCp4DWJViAcPq44MjW8qGMe0DK
L0nff54ifjhlMeBlc94PCU+x4gnE78OOW8cWxd1PDfisOgLMXS848AWqbRYs2KQA
j3g3Qm6pBGEg/ftTp9MkxWc=
-----END PRIVATE KEY-----`
};

admin.initializeApp({
    credential: admin.credential.cert(sa)
});

admin.firestore().collection('internship').limit(1).get()
    .then(snap => {
        console.log("SUCCESS! Got", snap.size, "records");
        process.exit(0);
    })
    .catch(err => {
        console.error("FAILED:", err);
        process.exit(1);
    });
