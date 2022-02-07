const Chart = require('@valdane/models/Chart');

//редактирование периода
exports.updPeriod = async ctx => {
    if( (new Date(+ctx.request.body.endPeriod) - new Date(+ctx.request.body.startPeriod)) < 0 ) {
        return ctx.throw(400, 'Конечная дата не должна быть меньше начальной');
    }

    try {
        const timeBlock = await Chart.findOneAndUpdate(
            {_id: ctx.request.body.blockId.trim()},
            {
                period: {
                    start: new Date(+ctx.request.body.startPeriod),
                    end: new Date(+ctx.request.body.endPeriod)
                }
            },
            {
                new: true, 
                runValidators: true //запускает валидаторы схемы перед записью
            }
        );


        const data = await Chart.findOne({_id: timeBlock.id})
            .populate('tech')
            .populate({         //deep populate
                path: 'staff',
                populate: {
                    path: 'position'
                }
            });

        ctx.body = {
            blockId: data._id,
            techCenterId: data.tech._id,
            staffId: data.staff._id,
            staffName: data.staff.name,
            staffShortName: data.staff.shortName,
            staffPosition: data.staff.position ? data.staff.position.title : '',
            start: timeBlock.period.start,
            end: timeBlock.period.end,
        };
    }
    catch (error) {
        throw error;
        // if (error.name === 'ValidationError') {
        //     ctx.status = 400;

        //     if (error.errors.title) {
        //         if (error.errors.title.kind === 'required') {
        //             return ctx.body = { path: 'title', message: 'Название тех. центра не может быть пустым' };
        //         }
        //     } 
        //     else if (error.errors.quantity) {
        //         return ctx.body = { path: 'quantity', message: 'Введите число' };
        //     }
        //     else throw error; //для ошибок валидации, которые не обрабатываются

        // } else throw error;
    }
};
//добавление периода
exports.addPeriod = async ctx => {
    if( (new Date(+ctx.request.body.endPeriod) - new Date(+ctx.request.body.startPeriod)) < 0 ) {
        return ctx.throw(400, 'Конечная дата не должна быть меньше начальной');
    }

    try {
        const timeBlock = await Chart.create({
            tech: ctx.request.body.techCenterId.trim() || undefined,
            staff: ctx.request.body.stafferId.trim() || undefined,
            period: {
                start: new Date(+ctx.request.body.startPeriod),
                end: new Date(+ctx.request.body.endPeriod)
            }
        });

        const data = await Chart.findOne({_id: timeBlock._id})
            .populate('tech')
            .populate({         //deep populate
                path: 'staff',
                populate: {
                    path: 'position'
                }
            });

        ctx.body = {
            blockId: data._id,
            techCenterId: data.tech._id,
            staffId: data.staff._id,
            staffName: data.staff.name,
            staffShortName: data.staff.shortName,
            staffPosition: data.staff.position ? data.staff.position.title : '',
            start: timeBlock.period.start,
            end: timeBlock.period.end,
        };
    }
    catch (error) {
        //throw error;
        // if (error.name === 'ValidationError') {
        //     ctx.status = 400;

        //     if (error.errors.title) {
        //         if (error.errors.title.kind === 'required') {
        //             return ctx.body = { path: 'title', message: 'Название тех. центра не может быть пустым' };
        //         }
        //     } 
        //     else if (error.errors.quantity) {
        //         return ctx.body = { path: 'quantity', message: 'Введите число' };
        //     }
        //     else throw error; //для ошибок валидации, которые не обрабатываются

        // } else throw error;
    }
};
//все графики
exports.allCharts = async ctx => {
    try {
        const filter = {
            'period.start': { $lt: ctx.request.query.end },
            'period.end': { $gt: ctx.request.query.start }
        };

        const data = await Chart.find(filter)
            .sort({ _id: 1 })
            .populate('tech')
            .populate({         //deep populate
                path: 'staff',
                populate: {
                    path: 'position'
                }
            });

        const charts = {};

        for (const p of data) {
            charts[p.tech._id] = charts[p.tech._id] || {
                techCenterId: p.tech._id,
                techCenterTitle: p.tech.title,
                periods: []
            };

            charts[p.tech._id].periods.push({
                blockId: p._id,
                staffId: p.staff._id,
                staffName: p.staff.name,
                staffShortName: p.staff.shortName,
                staffPosition: p.staff.position ? p.staff.position.title : '',
                start: p.period.start,
                end: p.period.end
            });
        }

        ctx.body = Object.values(charts);
    }
    catch (error) {
        throw error;
    }
};
//удаление периода
exports.delPeriod = async (ctx, next) => {
    try {
        const data = await Chart.findOne({_id: ctx.params.id})
            .populate('tech')
            .populate({         //deep populate
                path: 'staff',
                populate: {
                    path: 'position'
                }
            });

        await Chart.findOneAndDelete({_id: ctx.params.id});

        ctx.body = {
            blockId: data._id,
            techCenterId: data.tech._id,
            staffId: data.staff._id,
            staffName: data.staff.name,
            staffShortName: data.staff.shortName,
            staffPosition: data.staff.position ? data.staff.position.title : '',
        };
    }
    catch(error) {
        throw error;
    }
};


function delay(ms){
    return new Promise(res => {
        setTimeout(_ => res(), ms);
    });
}