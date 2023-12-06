import User from "../models/User.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendVerificationMail } from "../services/gmail.js";

const handleNewUser = async (req, res) => {
    const { user, pwd, email } = req.body;

    if(!user || !pwd) return res.status(400).json({ message: "Username and password are necessary" });

    const duplicate = await User.findOne({ username: user }).exec();

    if(duplicate) return res.status(409).json({ message: "Username already exists" });

    try {
        const hashedPwd = await bcrypt.hash(pwd, 10);
        const result = await User.create({
            "username": user,
            "password": hashedPwd
        });

        sendVerificationMail(email, result.username, result._id).catch(console.error);

        return res.status(200).json({ message: "SUCCESS" })
    }catch(err) {
        req.status(500).json({ message: err.message });
    }
}

const handleLogin = async (req, res) => {
    const { user, pwd } = req.body;

    const token = req.cookies.jwt;

    if(token) {

        jwt.verify(
            token,
            process.env.REFRESH_TOKEN,
            async (err, decoded) => {
                if(!err) {
                    const id = decoded.id;
                    const foundUser = await User.findOne({ _id: id }).exec();

                    if(!foundUser) return res.status(401).json({message: 'User not found.'});
                    if(!foundUser.isVerified) return res.status(401).json({message: 'User not Verified.'});

                    const accessToken = jwt.sign(
                        {
                            "UserInfo" : {
                                "id" : id
                            }
                        },
                        process.env.ACCESS_TOKEN,
                        { expiresIn: '100s' }
                    );
                    return res.status(200).json(
                        { 
                            id,
                            accessToken,
                            username: foundUser.username,
                            user: {...foundUser._doc, refreshToken: ""}
                        });
                }
                
            }
        )
    }else{
        if(!user || !pwd) return res.status(400).json({ message: "Username and password are necessary" });

        const foundUser = await User.findOne({ username: user }).exec();

        if(!foundUser) return res.status(401).json({message: 'User not found'});
        if(!foundUser.isVerified) return res.status(401).json({message: 'User not Verified.'});

        const match = await bcrypt.compare(pwd, foundUser.password);

        if(match) {
            console.log(foundUser._id.toString());
            const accessToken = jwt.sign(
                {
                    "UserInfo" : {
                        "id" : foundUser._id.toString()
                    }
                },
                process.env.ACCESS_TOKEN,
                { expiresIn: '100s' }
            );

            const refreshToken = jwt.sign(
                {
                    "id" : foundUser._id.toString()
                },
                process.env.REFRESH_TOKEN,
                {
                    expiresIn: '1d'
                }
            );

            foundUser.refreshToken = refreshToken;
            await foundUser.save();

            res.cookie('jwt', refreshToken, { 
                httpOnly: true, 
                maxAge: 24*60*60*1000,
            });

            return res.status(200).json({ message: "Logged in successfully", accessToken, username: foundUser.username, id: foundUser._id, user: {...foundUser._doc, refreshToken: ""} });
        }else{
            return res.status(401).json({ message: "Password dosen't match" })
        }
    }
}

export default { handleNewUser, handleLogin };