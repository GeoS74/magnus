const Position = require('@valdane/models/Position');

exports.allPositions = async ctx => {
    try {
        const positions = await Position.find().sort({_id:1});
        ctx.body = positions.map(pos => ({
            id: pos._id,
            title: pos.title
        }));
    }
    catch(error) {
        throw error;
    }
};

exports.addPosition = async ctx => {
    try {
        const position = await Position.create({
            title: ctx.request.body.title.trim()
        });
        ctx.body = {
            id: position._id,
            title: position.title
        };
    } 
    catch(error) {
        if(error.name === 'ValidationError'){
            ctx.throw(400, 'title incorrect')
        } else throw error;
    }
};

exports.delPosition = async (ctx, next) => {
    try {
        await Position.findOneAndDelete({_id: ctx.params.id});
        ctx.body = {
            id: ctx.params.id
        };
    }
    catch(error) {
        throw error;
    }
};

exports.updPosition = async ctx => {
    try {
        const position = await Position.findOneAndUpdate(
            {_id: ctx.params.id},
            {title: ctx.request.body.title.trim()},
            {
                new: true, 
                runValidators: true //запускает валидаторы схемы перед записью
            }
        );

        ctx.body = {
            id: position._id,
            title: position.title
        };
    }
    catch(error) {
        if(error.name === 'ValidationError'){
            ctx.throw(400, 'title incorrect')
        } else throw error;
    }
};


function delay(ms){
    return new Promise(res => {
        setTimeout(_ => res(), ms);
    });
}