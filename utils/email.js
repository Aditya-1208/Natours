const nodemailer = require('nodemailer')
const pug = require('pug')
const { htmlToText } = require('html-to-text')
const catchAsync = require('./catchAsync')

//new Email(user,url).sendWelcome()
module.exports = class Email {
    constructor(user, url) {
        this.to = user.email;
        this.firstName = user.name.split(' ')[0];
        this.url = url;
        this.from = `Aditya Agrawal <${process.env.EMAIL_FROM}>`
    };
    newTransport() {
        if (process.env.NODE_ENV === 'production') {
            //sendgrid
            return nodemailer.createTransport({
                service: 'sendGrid',
                auth: {
                    user: process.env.SENDGRID_USERNAME,
                    pass: process.env.SENDGRID_PASSWORD
                }
            });
        }
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }
    async send(template, subject) {
        //1 render html of template
        const html = pug.renderFile(`${__dirname}/../views/emails/${template}.pug`, {
            firstName: this.firstName,
            url: this.url,
            subject
        })

        //2 define email options
        const mailOptions = {
            from: process.env.NODE_ENV === 'dev' ? this.from : process.env.SENDGRID_EMAIL,
            to: this.to,
            subject,
            html,
            text: htmlToText(html,)
        }
        //3 create a transport and send email
        await this.newTransport().sendMail(mailOptions);
    }

    async sendWelcome() {
        //welcome is a pug template, so we can send html template!
        await this.send('welcome', 'Welcome to the natours family!');
    };

    async sendPasswordReset() {
        await this.send('PasswordReset', 'Reset Password, Token valid only for 10 minutes!')
    }
};


const sendEmail = catchAsync(async options => {
    //2 define email options
    const mailOptions = {
        from: 'Aditya Agrawal <adityaagr012@gmail.com>',
        to: options.email,
        subject: options.subject,
        text: options.text
        //html
    }

    //3 send mail


})