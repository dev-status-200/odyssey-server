const db = require("../../models");
const routes = require('express').Router();
const { Accounts } = require('../../models/');
const { Op, QueryTypes } = require("sequelize");
const { Child_Account, Parent_Account } = require("../../functions/Associations/accountAssociations");

const { Client_Associations } = require('../../functions/Associations/clientAssociation');
const { Vendor_Associations } = require('../../functions/Associations/vendorAssociations');
const { Vouchers, Voucher_Heads } = require("../../functions/Associations/voucherAssociations");
const moment = require("moment");
//Voucher Types

// (For Jobs)
// Job Reciept 
// Job Recievable 
// Job Payment 
// Job Payble 

// (For Expense)
// Expenses Payment 

async function getAllAccounts(id){
  let result;
  result = await Accounts.findAll({
    attributes:['id', 'title'],
    include:[{
      model:Parent_Account,
      where:{CompanyId:id},
      attributes:['id', 'title', 'editable', 'AccountId', 'CompanyId'],
      include:[{
        model:Child_Account,
        attributes:['id', 'title', 'ParentAccountId', 'createdAt', 'editable'],
        order: [['id', 'DESC']],
      }]
    }]
  });
  return result;
}

routes.post("/createParentAccount", async(req, res) => {
  try {
    const result = await Parent_Account.findOne({
      where: {
        [Op.and]: [
          { title: req.body.title },
          { CompanyId: req.body.CompanyId },
          { AccountId: req.body.AccountId }
        ]
      }
    })
    if(result){
       res.json({status:'exists'});
    }else{
      let values = req.body
      values.editable=1
      await Parent_Account.create(values);
      let val;
      val = await getAllAccounts(req.body.CompanyId);
      res.json({status:'success', result:val});
    }
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});

routes.post("/createChildAccount", async(req, res) => {
  try {
    const result = await Child_Account.findOne({
      where: {
        [Op.and]: [
          { title: req.body.title },
          { ParentAccountId: req.body.ParentAccountId }
        ]
      }
    })
    if(result){
       res.json({status:'exists'});
    }else{
      let values = req.body
      values.editable=1
      await Child_Account.create(values);
      let val;
      val = await getAllAccounts(req.body.CompanyId);
      res.json({status:'success', result:val});
    }
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});

routes.post("/editParentAccount", async(req, res) => {

  const {id, title, AccountId, CompanyId} = req.body
  try {
    const result = await Parent_Account.findOne({where:{title, AccountId, CompanyId}})
    if(result){
      res.json({status:'exists', result:result});
    }else{
      console.log(req.body)
      await Parent_Account.update({title:title},{where:{id:id}})
      let val;
      val = await getAllAccounts(CompanyId);
      res.json({status:'success', result:val});
    }
  }
  catch (error) {
    res.send({status:'error', result:error});
  }
});

routes.post("/editChildAccount", async(req, res) => {

  const {id, title, ParentAccountId, CompanyId} = req.body
  try {
    const result = await Child_Account.findOne({where:{title, ParentAccountId}})
    if(result){
      res.json({status:'exists', result:result});
    }else{
      console.log(req.body)
      await Child_Account.update({title:title},{where:{id:id}})
      let val;
      val = await getAllAccounts(CompanyId);
      res.json({status:'success', result:val});
    }
  }
  catch (error) {
    res.send({status:'error', result:error});
  }
});

routes.get("/getAllAccounts", async(req, res) => {
    try {
      let result;
      result = await getAllAccounts(req.headers.id);
      res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getAccountsForTransaction", async(req, res) => {
    let obj = {};
    if(req.headers.type=="Cash"){
      obj = {
        CompanyId:parseInt(req.headers.companyid),
        title:req.headers.type
      }
    } else if(req.headers.type=='Adjust') { 
      obj = {
        [Op.and]: [
          { title: { [Op.ne]: "Cash" } },
          { title: { [Op.ne]: "Accounts Recievable" } },
          { title: { [Op.ne]: "Accounts Payble" } },
          { title: { [Op.ne]: "Bank" } }
        ]
      }
    } else if(req.headers.type=='officevouchers') { 
      obj = {
        [Op.and]: [
          { title: { [Op.ne]: "Cash" } },
          { title: { [Op.ne]: "Accounts Recievable" } },
          { title: { [Op.ne]: "Accounts Payble" } },
          { title: { [Op.ne]: "Bank" } },
          { title: { [Op.ne]: "Income" } }, 
          { title: { [Op.ne]: "Selling Expense" } },
          { title: { [Op.ne]: "Taxes" } },
          { title: { [Op.ne]: "Bad Debts" } },
          { title: { [Op.ne]: "Charges" } },
          { title: { [Op.ne]: "Gain & Loss" } },
        ]
      }
    } else if(req.headers.type=='Charges') {
      obj = {
        title:req.headers.type,
        CompanyId:parseInt(req.headers.companyid),
      }
    } else if(req.headers.type=='Taxes') {
      obj = {
        title:req.headers.type,
        CompanyId:parseInt(req.headers.companyid),
      }
    } else if(req.headers.type=='Income'||'Selling Expense') {
      obj = {
        title:req.headers.type,
        CompanyId:parseInt(req.headers.companyid),
      }
    }else {
      obj = {title:req.headers.type} 
    }

    try {
      //console.log(obj)
      const result = await Child_Account.findAll({
        include:[{
          model:Parent_Account,
          attributes:['title', 'CompanyId'],
          where:obj,
          include:[{
            model:Accounts
          }]
        }]
      });
      res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getAllChilds", async(req, res) => {
  try {
    const result = await Child_Account.findAll({
      attributes:["title", "id"],
      include:[{
        model:Parent_Account,
        where:{CompanyId:req.headers.companyid},
        attributes:["title"]
      }]
    });
    res.json({status:'success', result:result});
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});

routes.get("/getSEJobChilds", async(req, res) => {
  try {

    const result = await Child_Account.findAll({
      attributes:["title", "id"],
      where:{title:JSON.parse(req.headers.title)},
      include:[{
        model:Parent_Account,
        where:{CompanyId:req.headers.companyid},
        attributes:["title", "CompanyId"]
      }]
    });

    res.json({status:'success', result:result});
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});

routes.get("/getSEJobPartyChilds", async(req, res) => {
  const clientObj = {
    model:Client_Associations,
    where:{CompanyId:req.headers.companyid, ClientId:req.headers.clientid},
    attributes:["id"],
    include:[{
      model:Child_Account,
      attributes:["id", "title"],
    }]
  }
  const vendorObj = {
    model:Vendor_Associations,
    where:{CompanyId:req.headers.companyid, VendorId:req.headers.clientid},
    include:[{
      model:Child_Account,
      attributes:["id", "title"],
    }]
  }
  try {
    const result = await Parent_Account.findOne({
      where:{
        title:req.headers.title,
        CompanyId:req.headers.companyid,
      },
      attributes:["id"],
      include:[req.headers.partytype=="vendor"?vendorObj:clientObj]
    });

    res.json({status:'success', result:req.headers.partytype!="vendor"? result.Client_Associations[0].Child_Account : result.Vendor_Associations[0].Child_Account });
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});

routes.get("/balanceSheet", async(req, res) => {
  try {
    const resultOne = await Accounts.findAll({
      attributes:["title"],
      where:{
        id:3//[ 5,4,3 ]
      },
      include:[{
        model:Parent_Account,
        where:{ CompanyId:req.headers.companyid },
        attributes:["title"],
        include:[{
          model:Child_Account,
          attributes:["title"],
          include:[{
            model:Voucher_Heads,
            attributes:["amount", "type"],
            include:[{
              model:Vouchers,
              attributes:["id"],
              where:{}
            }],
          }]
        }]
      }]
    });
    const resultTwo = await Accounts.findAll({
      attributes:["title"],
      where:{id:4},
      include:[{
        model:Parent_Account,
        where:{ CompanyId:req.headers.companyid },
        attributes:["title"],
        include:[{
          model:Child_Account,
          attributes:["title"],
          include:[{
            model:Voucher_Heads,
            attributes:["amount", "type"],
            include:[{
              model:Vouchers,
              attributes:["id"],
              where:{}
            }]
          }]
        }]
      }]
    });
    const capital = await Accounts.findAll({
      attributes:["title"],
      where:{id:5},
      include:[{
        model:Parent_Account,
        where:{ CompanyId:req.headers.companyid, title:"Capitals" },
        attributes:["title"],
        include:[{
          model:Child_Account,
          attributes:["title"],
          include:[{
            model:Voucher_Heads,
            attributes:["amount", "type"],
            include:[{
              model:Vouchers,
              attributes:["id"],
              where:{}
            }]
          }]
        }]
      }]
    });
    const drawings = await Accounts.findAll({
      attributes:["title"],
      where:{id:5},
      include:[{
        model:Parent_Account,
        where:{ CompanyId:req.headers.companyid, title:"Drawings" },
        attributes:["title"],
        include:[{
          model:Child_Account,
          attributes:["title"],
          include:[{
            model:Voucher_Heads,
            attributes:["amount", "type"],
            include:[{
              model:Vouchers,
              attributes:["id"],
              where:{}
            }]
          }]
        }]
      }]
    });
    const selling = await Accounts.findAll({
      attributes:[ "title" ],
      where:{id:[3]},
      include:[{
        model:Parent_Account,
        where:{ CompanyId:req.headers.companyid, title:["Cash", "Bank"] },
        attributes:[ "title" ],
        include:[{
          model:Child_Account,
          attributes:[ "title" ],
          include:[{
            model:Voucher_Heads,
            attributes:[ "amount", "type" ],
            include:[{
              model:Vouchers,
              where:{type:["Job Reciept"]},
              attributes:["id", "voucher_Id", "type"]
            }]
          }]
        }]
      }]
    });
    const costing = await Accounts.findAll({
      attributes:[ "title" ],
      where:{id:[3]},
      include:[{
        model:Parent_Account,
        where:{ CompanyId:req.headers.companyid, title:["Cash", "Bank"] },
        attributes:["title"],
        include:[{
          model:Child_Account,
          attributes:["title"],
          include:[{
            model:Voucher_Heads,
            attributes:["amount", "type"],
            include:[{
              model:Vouchers,
              where:{type:["Job Payment", "Expenses Payment"]},
              attributes:[ "id", "voucher_Id", "type" ],
            }]
          }]
        }]
      }]
    });
    res.json({ status:'success', 
      result:{
        assets:resultOne,
        liabilities:resultTwo,
        capital:capital,
        drawings:drawings,
        selling:selling,
        costing:costing,
      }
    });
  }
  catch (error) {
    res.json({ status:'error', result:error });
  }
});

routes.get("/voucherLedger", async(req, res) => {
  try {
    const result = await Child_Account.findAll({
      where:{ParentAccountId:req.headers.id},
      attributes:['title'],
      include:[
        { 
          model:Voucher_Heads,
          attributes:['amount', 'createdAt'],
          include:[{
            model:Vouchers,
            attributes:['voucher_Id', 'vType'],
          }]
        }
      ]
    })
    res.json({status:'success', result:result});
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});   

routes.get("/getByDate", async(req, res) => {
  try {
    const result = await Child_Account.findAll({
      where:{ParentAccountId:req.headers.id},
      attributes:['title'],
      include:[
        {
          model:Voucher_Heads,
          where:{
            createdAt: {
              // [Op.gte]: moment(req.headers.from).toDate(),
              [Op.lte]: moment(req.headers.to).add(1, 'days').toDate(),
            }
          },
          attributes:['amount', 'createdAt'],
          include:[{
            model:Vouchers,
            attributes:['voucher_Id', 'vType'],
            where:{}
          }]
        }
      ]
    }) 
    res.json({status:'success', result:result});
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
})

routes.get("/parentAccounts", async(req, res) => {
  try {
    const results = await Parent_Account.findAll({where: {CompanyId : req.headers.id}})
    
      res.json({status:'success', result:results});
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});

routes.post("/accountTest", async(req, res) => {
  let obj = []
  try {
    obj.forEach(async(x)=>{
        const result = await Parent_Account.create(x).catch((z)=>console.log(z))
        if(x.childs.length>0){
          let tempAccounts = [];
          x.childs.forEach((y)=>{
            tempAccounts.push({...y, ParentAccountId:result.id})
          })
          await Child_Account.bulkCreate(tempAccounts).catch((z)=>console.log(z))
        }
    });
    res.json({status:'success'});
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});

// routes.post("/accountTest", async(req, res) => {
//   let obj = [];
//   try {
//     await Child_Account.destroy({where:{editable:'1'}})
//     res.json({status:'success'});
//   }
//   catch (error) {
//     res.json({status:'error', result:error});
//   }
// });

module.exports = routes;

