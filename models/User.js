import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const userSchema = new Schema({
    isVerified: {
        type: Boolean,
        default: false
    },
    username: {
        type: String, 
        required: true
    },
    password: {
        type: String, 
        required: true
    },
    refreshToken: {
        type: String
    },
    joinedIn: {
        type: String,
        default: (new Date()).toDateString()
    },
    bio: {
        type: String,
        default: 'Bio from server'
    },
    profileSrc: {
        type: String,
        default: 'defaultProfile.png'
    },
    isActive: {
        type: Boolean, 
        default: false
    },
    friends: [{
        type: Schema.Types.ObjectId,
        ref: 'Users'
    }],
    requests: [{
        type: Schema.Types.ObjectId,
        ref: 'Users'
    }]
});

export default mongoose.model('Users', userSchema);