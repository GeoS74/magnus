const nodemailer = require('nodemailer')
const config = require('@root/config')

const transport = nodemailer.createTransport({
    host: config.mailer.host,
    port: config.mailer.port,
    secure: config.mailer.secure,
    auth: {
        user: config.mailer.user,
        pass: config.mailer.pass,
    },
})
//используй эту функцию внутри блока try{}catch{}
module.exports = async options => {
    await transport.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html || '',
    })
}

//создание пользователя и пароля для тестов
// const nodemailer = require('nodemailer')

// nodemailer.createTestAccount((err, account) => {
//     // create reusable transporter object using the default SMTP transport

//     let transporter = nodemailer.createTransport({
//         host: 'smtp.ethereal.email',
//         port: 587,
//         secure: false, // true for 465, false for other ports
//         auth: {
//             user: account.user, // generated ethereal user
//             pass: account.pass  // generated ethereal password
//         }
//     });

//     console.log(account)
// });



// проверка соединения
// transport.verify(function (error, success) {
//     if (error) {
//       console.log(error);
//     } else {
//       console.log("Server is ready to take our messages");
//     }
//   });



// app.use(async (ctx, next) => {
//     if(ctx.path !== '/mail') return next();

    // let transporter = nodemailer.createTransport({
    //     host: 'cargobox.site',
    //     port: 465,
    //     secure: true,
    //     auth: {
    //         user: 'noreply@cargobox.site',
    //         pass: 'ljdfnjhf10',
    //     },
    // })

    // let result = await transporter.sendMail({
    //     from: '"Node js" <noreply@cargobox.site>',
    //     to: 'gsirotkin@yandex.ru',
    //     subject: 'Привет',
    //     text: 'This message was sent from Node js server.',
    //     html: 'This <i>message</i> was sent from <strong>Node js</strong> server.',
    // })

//     ctx.body = 'mail send'
// })