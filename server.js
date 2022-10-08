process.on('uncaughtException', err => {
    console.log(err.name, err.message);
    console.log('UNHANDLED EXCEPTION 💥. Shutting off');
    process.exit(1);
})

const dotenv = require('dotenv');
const mongoose = require('mongoose');


dotenv.config({ path: './config.env' })
const app = require('./app')

const DATABASE = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose.connect(DATABASE).then(con => {
    console.log('connected to database');
}).catch(err => console.log(err));



// console.log(app.get('env'));
// console.log(process.env);
//starting server
const port = process.env.PORT;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}`);
});

process.on('unhandledRejection', (err) => {
    console.log(err, err.name, err.message);
    server.close(() => {
        console.log('UNHANDLED EXCEPTION 💥. Shutting off');
        process.exit(1);
    })
})