import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const messageSchema = new Schema({
    id: {
        type: String, 
        required: true
    },
    messages: [
        {
            sender: {
                type: String,
                required: true
            },
            receiver: {
                type: String,
                required: true
            },
            timestamp: {
                type: String,
                required: true
            },
            message: {
                type: String,
                required: true
            },
        }
    ]

});

export default mongoose.model('Messages', messageSchema);