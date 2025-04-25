const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'mail.inbox.lv',
    port: 587,
    secure: false,
    auth: {
      user: 'beemazing@inbox.lv',
      pass: '6BZ54xudDX' // Use the IMAP/SMTP password
    },
    timeout: 10000,
    tls: {
      rejectUnauthorized: false
    }
  });

transporter.verify((error, success) => {
  if (error) {
    console.error('🔥 SMTP connection error:', error);
  } else {
    console.log('✅ SMTP server is ready to send emails');
  }
});

const mailOptions = {
  from: 'beemazing@inbox.lv',
  to: 'g4mechanger@inbox.lv',
  subject: 'Local Test Email',
  text: 'This is a test email sent locally.'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('🔥 Send email error:', error);
  } else {
    console.log('✅ Email sent:', info.response);
  }
});