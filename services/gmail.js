import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'firstacc30@gmail.com', // Gmail address
      pass: 'rexc cuty kivx efif'   //Gmail password or app-specific password
    },
    secure: true,
});
  

export async function sendVerificationMail(email, username, id) {

  const info = await transporter.sendMail({
    from: 'firstacc30@gmail.com',
    to: email,
    subject: "ZChat Verification", // Subject line
    html: `
    <body>
        <h1>ZChat Verification</h1>
        <h2>${username}, please follow this link to verify your account.</h2>
        <a href='http://localhost:3000/sendverify/${id}'>Verify</a>
    </body>
    `, // html body
  });

  console.log("Message sent: %s", info.messageId);

}



