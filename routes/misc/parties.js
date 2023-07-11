
const routes = require('express').Router();
const Sequelize = require('sequelize');
const { Invoice, Charge_Head } = require("../../functions/Associations/incoiceAssociations");
const { SE_Job, SE_Equipments } = require("../../functions/Associations/jobAssociations/seaExport");
const { Clients } = require("../../functions/Associations/clientAssociation");
const { Vendors } = require("../../functions/Associations/vendorAssociations");
const { Employees } = require("../../functions/Associations/employeeAssociations");
const Op = Sequelize.Op;
const url = 'parties';
const moment = require("moment");

routes.post(`/${url}/getBySearch`, async(req, res) => {
  console.log(req.body.search)
  try {
    let result;
    if(req.body.type=="client"){
      result = await Clients.findAll({
        attributes:['id', 'name'],
        //attributes: ['id',fn('CONCAT', col('name'), ' ', col('code'))],
        where:{
          [Op.or]: [
            { code: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('code')), 'LIKE', '%' + req.body.search.toLowerCase() + '%') },
            { name: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('name')), 'LIKE', '%' + req.body.search.toLowerCase() + '%') }, 
          ],
        }
      })
    } else if (req.body.type=="vendor"){
      result = await Vendors.findAll({
        attributes:['id', 'name'],
        where:{
          [Op.or]: [
            { code: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('code')), 'LIKE', '%' + req.body.search.toLowerCase() + '%') },
            { name: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('name')), 'LIKE', '%' + req.body.search.toLowerCase() + '%') }, 
          ],
          types: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('types')), 'NOT LIKE', '%overseas agent%'),
        }
      })
    } else if(req.body.type=="agent"){
      result = await Vendors.findAll({
        attributes:['id', 'name'],
        where:{
          [Op.or]: [
            { code: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('code')), 'LIKE', '%' + req.body.search.toLowerCase() + '%') },
            { name: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('name')), 'LIKE', '%' + req.body.search.toLowerCase() + '%') }, 
          ],
          types: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('types')), 'LIKE', '%overseas agent%'),
        }
      })
    }else if("representative"){
      result = await Employees.findAll({
        attributes:['id', 'name'],
        where:{
          name: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('name')), 'LIKE', '%' + req.body.search.toLowerCase() + '%')
        }
      })
    }
    res.json({status:'success', result:result});
  }
  catch (error) {
    res.json({status: 'error', result: error});
  }
});

routes.post(`/${url}/getJobBalance`, async(req, res) => {
    try {
      let result;
      if(req.body.type=="client"){
        result = await SE_Job.findAll({
        //where:{ClientId:req.body.id},
        attributes:['id', 'jobNo', 'subType', 'freightType', 'fd', 'vol', 'weight'],
        include:[
          {
            model:Invoice,
            where:{
              //party_Id:req.body.id,
              payType:req.body.payType,
              party_Id:req.body.id,
              status:{[Op.ne]:'0'},
              createdAt: {
                [Op.gte]: moment(req.body.from).toDate(),
                [Op.lte]: moment(req.body.to).add(1, 'days').toDate(),
              }
            },
            attributes:['invoice_No', 'payType', 'status', 'createdAt', 'party_Name', 'paid', 'recieved','roundOff', 'total'],
          },
          {
            model:SE_Equipments,
            attributes:['qty', 'size']
          },
        ],
        }).catch((x)=>console.log(x));
    }else{
      result = await SE_Job.findAll({
        attributes:['id', 'jobNo', 'subType', 'freightType', 'fd', 'vol', 'weight'],
        include:[
          {
            model:Invoice,
            where:{
              payType:req.body.payType,
              party_Id:req.body.id,
              status:{[Op.ne]:'0'}
            },
            attributes:['invoice_No', 'payType', 'status', 'createdAt', 'party_Name', 'payType', 'paid', 'recieved', 'total'],
          },
          {
            model:SE_Equipments,
            attributes:['qty', 'size']
          },
        ],
        }).catch((x)=>console.log(x));
    }
      res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status: 'error', result: error});
    }
});

routes.post(`/${url}/getJobBalanceNew`, async(req, res) => {
  try {
    let result;
    if(req.body.type=="client"){
      result = await Invoice.findAll({
        where:{
          payType:req.body.payType,
          party_Id:req.body.id,
          status:{[Op.ne]:'0'},
          createdAt: {
            [Op.gte]: moment(req.body.from).toDate(),
            [Op.lte]: moment(req.body.to).add(1, 'days').toDate(),
          }
        },
        attributes:['invoice_No', 'payType', 'status', 'createdAt', 'party_Name', 'paid', 'recieved', 'roundOff', 'total', 'ex_rate'],
        include:[
          {
            model:SE_Job,
            attributes:['id', 'jobNo', 'subType', 'freightType', 'fd', 'vol', 'weight'],
            include:[{
              model:SE_Equipments,
              attributes:['qty', 'size']
            }]
          },
          {
            model:Charge_Head,
            attributes:['id'],
            where:{},
          }
        ],
      }).catch((x)=>console.log(x));
    } else {
      result = await Invoice.findAll({
        where:{
          payType:req.body.payType,
          party_Id:req.body.id,
          status:{[Op.ne]:'0'},
          createdAt: {
            [Op.gte]: moment(req.body.from).toDate(),
            [Op.lte]: moment(req.body.to).add(1, 'days').toDate(),
          }
        },
        attributes:['invoice_No', 'payType', 'status', 'createdAt', 'party_Name', 'paid', 'recieved', 'roundOff', 'total'],
        include:[
          {
            model:SE_Job,
            attributes:['id', 'jobNo', 'subType', 'freightType', 'fd', 'vol', 'weight'],
            include:[{
              model:SE_Equipments,
              attributes:['qty', 'size']
            }]
          },
          {
            model:Charge_Head,
            attributes:['id'],
            where:{},
          }
        ],
      }).catch((x)=>console.log(x));
    }
    res.json({status:'success', result:result});
  }
  catch (error) {
    res.json({status: 'error', result: error});
  }
});

routes.get("/dateExperiment", async(req, res) => {
  try {
      const from = moment("2023-02-23");
      const to = moment("2023-02-25");
      const resultOne = await Invoice.findAll({
        where:{
          createdAt: {
            [Op.gte]: from.toDate(),
            [Op.lte]: to.toDate(),
           }
        },
        order: [[ 'createdAt', 'ASC' ]]
      });
      res.json({status:'success', result:{ resultOne }});
      }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

module.exports = routes;