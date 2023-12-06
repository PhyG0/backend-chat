import express from "express";
import path from 'path';
import { createServer } from 'http';
import { fileURLToPath } from "url";
import {Server} from 'socket.io'
import dotenv from 'dotenv';
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from 'cors';
import mongoose from 'mongoose';

import corsOptions from "./config/corsOptions.js";
import authController from "./controllers/authController.js";
import connectDB from "./config/connectDb.js";

import apiRouter from './routes/apiRoute.js';
import multer from "multer";
import User from "./models/User.js";
import Message from "./models/Message.js";
import { promisify } from "util";
import fs from 'fs';
import verifyJWT from "./middleware/verifyJWT.js";

const createMessage = async (input) => {
    input.sort();
    const messageCollection = await Message.create({
        id: input[0] + input[1]
    });
    console.log(messageCollection);
}

const storage = multer.diskStorage({
    destination: 'profiles/',
    filename: async (req, file, cb) => {
        const user = await User.findOne({ username: req.body.username.split(":")[1] }).exec();
        
        const profileSrc = 'profile_' + user._id.toString() + path.extname(file.originalname);
        user.profileSrc = profileSrc;
        await user.save();
        cb(null, 'profile_' + user._id.toString() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if(!file) return cb(null, false);
    cb(null, true);
}

const upload = multer({ 
    storage, 
    fileFilter
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

connectDB();

const app = express();

app.use(cors(corsOptions));

const server = createServer(app);
const io = new Server(server, { cors: corsOptions });

//middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.json({ limit: '50mb' }))
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'profiles')));
app.use(bodyParser.urlencoded({ extended: true }))

//routes
app.use('/register', authController.handleNewUser);
app.use('/login', authController.handleLogin);
app.get('/logout', (req, res) => {
    res.clearCookie('jwt');
    res.status(200).json({ message: "cleared cookie" })
});

app.get('/verify/:id', async (req, res) => {
    const id = req.params.id;
    const user = await User.findOne({ _id: id });
    if(user){
        user.isVerified = true;
        await user.save();
        return res.status(200).json({ message: 'Verified successfully.' });
    }

    return res.status(400).json({ message: 'User with given id not present.' })
    
});

app.get('/sendverify/:id', async (req, res) => {
    const id = req.params.id;
    const readFileAsync = promisify(fs.readFile);
    let htmlContent = await readFileAsync('./public/verify.html', 'utf8');
    htmlContent = htmlContent.replace('${id}', id);
    res.send(htmlContent);
});

//protected routes
app.use('/api/user', apiRouter);
app.get('/messages/:id', async (req, res) => {
    const id = req.params.id;

    const messages = await Message.findOne({ id });
    const response = { messages: [], sender:'', receiver: '' };

    if(messages && messages.messages.length > 0){
        const hash = {};
        const sender = await User.findOne({ _id: messages.messages[0].sender });
        const receiver = await User.findOne({ _id: messages.messages[0].receiver });
        hash[messages.messages[0].sender] = sender.username;
        hash[messages.messages[0].receiver] = receiver.username;

        return res.status(200).json({ messages: messages.messages, hash: hash });
    }else return res.status(500).json({ message: 'Something wrong getting the messages. Try again later' });
});

app.post('/sendMessage', async (req, res) =>{
    const { sender, receiver, message, timestamp } = req.body;

    if(!sender || !receiver || !message || !timestamp) {
        return res.status(400).json({ message: "sender, receiver, message and timestamp are required" });
    }

    const id = [sender, receiver].sort();
    const searchId = id[0] + id[1];

    const messageDoc = await Message.findOne({
        id: searchId
    });
    messageDoc.messages.push({
        sender, 
        receiver,
        message,
        timestamp
    }); 
    await messageDoc.save();

    res.status(200).json({ message: "Request received" });
});

app.post('/deleteRequest', async (req, res) => {
    const { userId, requestId } = req.body;
    const result = await User.updateOne(
        { _id: userId },
        { $pull: { requests: requestId } }
    );
    const user = await User.findOne({
        _id: userId
    });
    return res.status(200).json({ message: 'Deleted successfully', user });
});

app.post('/acceptFriend', async (req, res) => {
    const { userId, friendId } = req.body;
    const result = await User.updateOne(
        { _id: userId },
        { $push: { friends: friendId } }
    );
    const result2 = await User.updateOne(
        { _id: friendId },
        { $push: { friends: userId } }
    );
    await User.updateOne(
        { _id: userId },
        { $pull: { requests: friendId } }
    );
    const user = await User.findOne({ _id: userId });
    if(result.acknowledged){
        await createMessage([userId, friendId]);
        return res.status(200).json({ message: 'Added successfully', user });
    }else{
        return res.status(200).json({ message: 'Failed to accept the request', user: null });
    }

});


app.post('/userUpdate', upload.single('imageFile'), async (req, res) =>{
    const user = await User.findOne({ username: req.body.oldUserName }).exec();

    if(!user) return res.status(400).json({ message: "User not found" });
    
    const { username, bio } = req.body;

    if(!username) username = '';
    if(!bio) bio = '';

    user.username = username.split(":")[0];
    user.bio = bio;
    await user.save();

    return res.status(200).json({ message: "User Info saved successfully", status: 'success' })

});

app.get('/allusers', (req, res) => {
    try{
        User.find().then(usersArray => {
            return res.status(200).json({ usersArray });
        });
    }catch{
        return res.status(401).json({ message: 'Error getting users' });
    }
});

app.post('/addFriend', (req, res) => {
    const addFriend = async (userId, friendId) => {
        const foundUser = await User.findOne({
            _id: userId
        });
        let alreadyFriend = false;
        for(let i = 0; i < foundUser.requests.length; i++){
            const friend = foundUser.requests[i];
            if(friend == friendId){
                alreadyFriend = true;
                break;
            }
        }

        for(let i = 0; i < foundUser.friends.length; i++){
            const friend = foundUser.friends[i];
            if(friend == friendId){
                alreadyFriend = true;
                break;
            }
        }

        if(alreadyFriend) {
            return res.status(200).json({
                message: "Already send request.",
                success: false
            });
        }
        const result = await User.updateOne(
            { _id: friendId },
            { $push: { requests: userId } }
        );

        if (result.modifiedCount === 1) {
            return res.status(200).json({
                message: "Request sent successfully.",
                success: true
            });
        } 
    };

    addFriend(req.body.userId, req.body.friendId);
});



//404 page
app.get('/*', (req, res) => {
    res.status(404).json({ message: "Not found" });
});

io.on('connection', (socket) => {
    console.log("New user connected");

    socket.on('disconnet', () => {
        console.log("User disconnected");
    });

    socket.on('message', (data) => {
        socket.broadcast.emit('message', data);
    });

});

mongoose.connection.once('open', () => {
    console.log("connted to MongoDB");
    server.listen(3000, () => {
        console.log("Server is running on port 3000");
    });
})