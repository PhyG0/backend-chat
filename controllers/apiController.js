import User from "../models/User.js";

const getUser = async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    const userName = req.params.userName;

    const user = await User.findOne({ username: userName }).exec();
    if(!user)         return res.status(400).json({ message: "User dosen't exist", user: null });
    user.refreshToken = '';

    if(user){
        return res.status(200).json({ user });
    }else{
        return res.status(400).json({ message: "User dosen't exist", user: null });
    }
}

const getUserById = async (req, res) => {
    const _id = req.params.userId;
    const user = await User.findOne({ _id });
    if(!user) return res.status(400).json({ message: 'User dosent exitst or deleted' });
    user.refreshToken = "";
    return res.status(200).json(user);
}

const getUsersById = async (req, res) => {
    const _id = req.params.userId;
    const user = await User.findOne({ _id });
    if(!user) return res.status(400).json({ message: 'User dosent exitst or deleted' });
    const response = {
        friends: [],
        requests: []
    }
    for(let i = 0; i < user.friends.length; i++){
        const friend = user.friends[i];
        const f = await User.findOne({ _id: friend });
        f.refreshToken = "";
        response.friends.push(f);
    }
    for(let i = 0; i < user.requests.length; i++){
        const request = user.requests[i];
        const f = await User.findOne({ _id: request });
        f.refreshToken = "";
        response.requests.push(f);
    }
    res.status(200).json(response);
}

export default { getUser, getUserById, getUsersById };