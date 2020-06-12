var nodemailer = require('nodemailer');

exports.sentMailer = function (from1, { email }, subject, content) {
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

        let mail = {
            from: 'Event. <datn.qlsk@gmail.com>',
            to: email,
            subject: subject,
            html: content
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
