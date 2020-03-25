var nodemailer = require('nodemailer');

exports.sentMailer = function (from, { email }, subject, content, next) {
    return new Promise((resolve, reject) => {
        let transporter = nodemailer.createTransport({
            service: 'Gmail',
            host: 'smtp.gmail.com',
            // port: 465,
            port: 587,
            // secure: true,
            secure: false,
            requireTLS: true,
            auth: {
                // type: 'OAuth2',
                user: 'ahayday2018@gmail.com',
                pass: 'sang1998'
            }
        });

        let mail = {
            from: from,
            to: email,
            subject: subject,
            html: content
        };

        transporter.sendMail(mail, function (error, info) {
            if (error) {
                reject(error);
            } else {
                resolve({ message: 'success!', code: 200 });
            }
        });
    });
};