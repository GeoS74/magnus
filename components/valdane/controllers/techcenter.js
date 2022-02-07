const Position = require('@valdane/models/TechCenter');

exports.allTechCenter = async ctx => {
    try {
        const positions = await Position.find().sort({ _id: -1 });
        ctx.body = positions.map(pos => ({
            id: pos._id,
            title: pos.title,
            address: pos.address,
            quantity: pos.quantity
        }));
    }
    catch (error) {
        throw error;
    }
};

exports.addTechCenter = async ctx => {
    try {
        const position = await Position.create({
            title: ctx.request.body.title.trim(),
            address: ctx.request.body.address.trim() || undefined,
            quantity: ctx.request.body.quantity.trim() || undefined
        });
        ctx.body = {
            id: position._id,
            title: position.title,
            address: position.address,
            quantity: position.quantity
        };
    }
    catch (error) {
        if (error.name === 'ValidationError') {
            ctx.status = 400;

            if (error.errors.title) {
                if (error.errors.title.kind === 'required') {
                    return ctx.body = { path: 'title', message: 'Название тех. центра не может быть пустым' };
                }
            } 
            else if (error.errors.quantity) {
                return ctx.body = { path: 'quantity', message: 'Введите число' };
            }
            else throw error; //для ошибок валидации, которые не обрабатываются

        } else throw error;
    }
};

exports.delTechCenter = async (ctx, next) => {
    try {
        await Position.findOneAndDelete({ _id: ctx.params.id });
        ctx.body = {
            id: ctx.params.id
        };
    }
    catch (error) {
        throw error;
    }
};

exports.updTechCenter = async ctx => {
    try {
        const position = await Position.findOneAndUpdate(
            { _id: ctx.params.id },
            {
                title: ctx.request.body.title.trim(),
                address: ctx.request.body.address.trim() || null,
                quantity: ctx.request.body.quantity.trim() || null
            },
            {
                new: true,
                runValidators: true //запускает валидаторы схемы перед записью
            }
        );

        ctx.body = {
            id: position._id,
            title: position.title,
            address: position.address,
            quantity: position.quantity
        };
    }
    catch (error) {
        if (error.name === 'ValidationError') {
            ctx.status = 400;

            if (error.errors.title) {
                if (error.errors.title.kind === 'required') {
                    return ctx.body = { path: 'title', message: 'Название тех. центра не может быть пустым' };
                }
            } else throw error; //для ошибок валидации, которые не обрабатываются
        }
        else if (error.name === 'CastError') {
            ctx.status = 400;

            if (error.path === 'quantity') {
                 
                return ctx.body = { path: 'quantity', message: 'Введите число' };
            } else throw error; //для ошибок валидации, которые не обрабатываются

        } else throw error;
    }
};
