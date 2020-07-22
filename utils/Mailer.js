var nodemailer = require('nodemailer');

const formatEmail = (token, username, subject) => {
    var title = ""
    if (subject == "REGISTER") {
        title = "Thanks for signing up with EVENT IN YOUR HAND. You need to enter below code for activate your account."
    } else if (subject == "FORGOT") {
        title = 'Someone has requested a link to change your password. You need to enter below code for reset your password.'
    }

    let message = ` If you didn't request this, please ignore this email.`
    let thank = ` Thank you for using our services!`
    let result = '<p> Hello <b>' + username + '</b>,</p>' + title + '</p> <ul> <h1>' + token + '</h1>  <li>' + message + '</li> </ul>' + '<p>' + thank + '</p>'
  
    return result;
  }
  
exports.sentMailer = function (from1, { email, fullName }, subject, content) {
    return new Promise(async (resolve, reject) => {
        let transporter = nodemailer.createTransport({
            //service: 'Gmail',
            host: 'smtp.gmail.com',
            port: 465,
            //port: 587,
            secure: true,
            //secure: false,
            //requireTLS: true,
            auth: {
                // type: 'OAuth2',
                user: 'datn.qlsk@gmail.com',
                pass: 'datn.qlsk.2020'
            },
        });

        let htmlContent = formatEmail(content, fullName, subject)

        let mail = {
            from: 'Event. <datn.qlsk@gmail.com>',
            to: email,
            subject: "EVENT IN YOUR HAND",
            html: htmlContent
        };

        // transporter.verify(function (error, success) {
        //     if (error) {
        //         resolve({ message: 'Server is not ready to take our messages!', code: 400 });
        //     } else {
        //         console.log("Server is ready to take our messages");
        //     }
        // });

        transporter.sendMail(mail, function (error, info) {

            if (error) {
                reject(error);
            } else {
                resolve({ message: 'success!', code: 200 });
            }

        });
    });
};
