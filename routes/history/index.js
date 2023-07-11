const routes = require('express').Router();
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { Employees } = require("../../functions/Associations/employeeAssociations")
const { History } = require("../../functions/Associations/historyAssociations")

routes.get("/getHistory", async(req, res) => {
    console.log(req.headers)
    try {
        const result = await History.findAll({ 
            where:{
                recordId:req.headers.recordid,
                type:req.headers.type
            },
            order: [
                ['createdAt', 'DESC'],
            ],
            include:[
            {
                model:Employees,
                attributes:['name']
            }
        ]})
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

module.exports = routes;