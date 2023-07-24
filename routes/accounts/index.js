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

module.exports = routes;

let obj = [
  {
      "title": "FIXED ASSETS",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": [
          {
              "title": "FURNITURE & FIXTURE",
              "editable": "1"
          },
          {
              "title": "VEHICLE  ACCOUNT",
              "editable": "1"
          },
          {
              "title": "TELEPHONE & FAX MACHINE",
              "editable": "1"
          },
          {
              "title": "COMPUTER & ELECTRIC EQUIPMENT",
              "editable": "1"
          },
          {
              "title": "SPLIT & WINDOW A.C",
              "editable": "1"
          },
          {
              "title": "LAND & BUILDING",
              "editable": "1"
          },
          {
              "title": "COPY RIGHT & PATENTS",
              "editable": "1"
          },
          {
              "title": "TRADE MARK & FRANCHISES",
              "editable": "1"
          },
          {
              "title": "BANK GUARANTEE SECURITY DEPOSIT",
              "editable": "1"
          },
          {
              "title": "MIRA (DAIHATSU) M:2012",
              "editable": "1"
          },
          {
              "title": "PROPERTY PLANT & EQUIPMENT",
              "editable": "1"
          },
          {
              "title": "REFRIGERATOR & AIR CONDITIONER",
              "editable": "1"
          },
          {
              "title": "OFFICE EQUIPMENT",
              "editable": "1"
          }
      ]
  },
  {
      "title": "ASSET LIST",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": [
          {
              "title": "COMPUTER ACCESSORIES",
              "editable": "1"
          },
          {
              "title": "FAX MACHINE",
              "editable": "1"
          },
          {
              "title": "MOBILE PHONE",
              "editable": "1"
          },
          {
              "title": "MOTOR CYCLE",
              "editable": "1"
          }
      ]
  },
  {
      "title": "ACCUMULATED DEPRICIATION",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": [
          {
              "title": "ACCU. FURNITURE & FIXTURE",
              "editable": "1"
          },
          {
              "title": "ACCU. COMPUTER & PRINTERS",
              "editable": "1"
          },
          {
              "title": "ACCU. AIR CONDITIONERS",
              "editable": "1"
          },
          {
              "title": "ACCU. OFFICE EQUIPMENT",
              "editable": "1"
          },
          {
              "title": "ACCU. FAX MACHINE",
              "editable": "1"
          },
          {
              "title": "ACCU. MOBILE PHONE",
              "editable": "1"
          },
          {
              "title": "ACCU. MOTOR CYCLE",
              "editable": "1"
          }
      ]
  },
  {
      "title": "ACCU. VEHICLE ACCOUNT",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": []
  },
  {
      "title": "CURRENT ASSETS",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": [
          {
              "title": "RECEIVABLE FROM COMPANIES",
              "editable": "1"
          },
          {
              "title": "RECEIVABLES IMPORT",
              "editable": "1"
          },
          {
              "title": "WITHHOLDING TAX",
              "editable": "1"
          },
          {
              "title": "STANDARD CHARTERD USD",
              "editable": "1"
          },
          {
              "title": "ACS RECEIVABLE",
              "editable": "1"
          },
          {
              "title": "MASOOD TEXTILE MILLS LTD",
              "editable": "1"
          },
          {
              "title": "ARSHAD CORPORATION (PVT)LTD",
              "editable": "1"
          },
          {
              "title": "AFINO TEXTILE MILLS",
              "editable": "1"
          },
          {
              "title": "RECEIVABLES CLEARING",
              "editable": "1"
          },
          {
              "title": "A/C BAD DEBT",
              "editable": "1"
          },
          {
              "title": "JAGUAR (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "SADAQAT LIMITED",
              "editable": "1"
          }
      ]
  },
  {
      "title": "CASH & BANK",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": [
          {
              "title": "PETTY CASH",
              "editable": "1"
          },
          {
              "title": "CASH IN HAND",
              "editable": "1"
          },
          {
              "title": "CASH IN DOLLARS",
              "editable": "1"
          },
          {
              "title": "CHEQUE IN HAND",
              "editable": "1"
          },
          {
              "title": "BAH EUR LOG",
              "editable": "1"
          },
          {
              "title": "UNITED BANK LIMITED KHI",
              "editable": "1"
          },
          {
              "title": "HMB SNSL NEW BANK",
              "editable": "1"
          },
          {
              "title": "ASKARI COMMERCIAL BANK",
              "editable": "1"
          },
          {
              "title": "HABIB METRO BANK (SNSL)",
              "editable": "1"
          },
          {
              "title": "ASKARI FOREIGN A/C",
              "editable": "1"
          },
          {
              "title": "STANDARD CHARTERED BANK (NEW)",
              "editable": "1"
          },
          {
              "title": "STANDARD CHARTERED USD",
              "editable": "1"
          },
          {
              "title": "BANK AL-HABIB SNSL",
              "editable": "1"
          },
          {
              "title": "SAMBA BANK LTD",
              "editable": "1"
          },
          {
              "title": "HABIB BANK LTD (HBL)",
              "editable": "1"
          },
          {
              "title": "CASH BOOK",
              "editable": "1"
          },
          {
              "title": "ASKARI BANK LTD (BOSS)",
              "editable": "1"
          },
          {
              "title": "BANK AL HABIB ACS",
              "editable": "1"
          },
          {
              "title": "AL FALAH BANK ACS",
              "editable": "1"
          },
          {
              "title": "BANK AL HABIB ACS PVT LTD",
              "editable": "1"
          },
          {
              "title": "MEEZAN BANK (SNSL)",
              "editable": "1"
          },
          {
              "title": "HABIB METRO BANK (ACS)",
              "editable": "1"
          },
          {
              "title": "HABIB BANK LTD (ACS)",
              "editable": "1"
          },
          {
              "title": "SUMMIT BANK TARIQ ROAD BRANCH",
              "editable": "1"
          },
          {
              "title": "BANK AL HABIB IFA",
              "editable": "1"
          },
          {
              "title": "ASKARI BANK NEW TARIQ RD BR",
              "editable": "1"
          },
          {
              "title": "HMB ACS NEW BANK",
              "editable": "1"
          },
          {
              "title": "BANK AL FALAH  USD  (BOSS)",
              "editable": "1"
          },
          {
              "title": "ASKARI  (ACS)",
              "editable": "1"
          },
          {
              "title": "SONERI BANK LIMITED (SNSL)",
              "editable": "1"
          },
          {
              "title": "SONERI BANK LIMITED (ACS)",
              "editable": "1"
          },
          {
              "title": "SONERI BANK LTD. I.F.A",
              "editable": "1"
          },
          {
              "title": "BANK AL HABIB SNSL NEW",
              "editable": "1"
          },
          {
              "title": "AL BARAKA BANK (ACS)",
              "editable": "1"
          },
          {
              "title": "AL BARAKA BANK (SNSL)",
              "editable": "1"
          },
          {
              "title": "CASH RESERVE",
              "editable": "1"
          },
          {
              "title": "HBL-FD",
              "editable": "1"
          }
      ]
  },
  {
      "title": "ACCOUNT RECEIVABLE",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": [
          {
              "title": "ARTISTIC DENIM MILLS LTD",
              "editable": "1"
          },
          {
              "title": "ARTISTIC FABRIC MILLS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "ARTISTIC GARMENTS INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "AYOOB TEX.",
              "editable": "1"
          },
          {
              "title": "AYOOB TEXTILE MILLS LTD",
              "editable": "1"
          },
          {
              "title": "AZ APPAREL CHAK",
              "editable": "1"
          },
          {
              "title": "AZGARD NINE LIMITED",
              "editable": "1"
          },
          {
              "title": "BARAKA TEXTILES",
              "editable": "1"
          },
          {
              "title": "BARI TEXTILE MILLS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "BATLASONS,",
              "editable": "1"
          },
          {
              "title": "BESTWAY CEMENT LIMITED",
              "editable": "1"
          },
          {
              "title": "BHANERO TEXTILE MILLS LTD",
              "editable": "1"
          },
          {
              "title": "CAMBRIDGE GARMENT INDUSTRIES(PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "CARE LOGISTICS PVT LTD",
              "editable": "1"
          },
          {
              "title": "CENTURY ENGINEERING INDUSTRIES (PVT)LTD.",
              "editable": "1"
          },
          {
              "title": "CHAWALA ENTERPRISES TEXTILES MANUFA",
              "editable": "1"
          },
          {
              "title": "CONVENIENCE FOOD INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "CRESCENT COTTON MILLS LIMITED",
              "editable": "1"
          },
          {
              "title": "D.K INDUSTRIES (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "DIAMOND FABRICS LIMITED",
              "editable": "1"
          },
          {
              "title": "DOUBLE \"A\" INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "DYNAMIC PACKAGING PVT LTD",
              "editable": "1"
          },
          {
              "title": "EMBASSY OF DENMARK",
              "editable": "1"
          },
          {
              "title": "EUR LOGISTICS SERVICES PAKISTAN PRIVATE LTD",
              "editable": "1"
          },
          {
              "title": "FAZAL & CO.",
              "editable": "1"
          },
          {
              "title": "FEROZE1888 MILLS LTD",
              "editable": "1"
          },
          {
              "title": "FINE GROUP INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "FIRST AMERICAN CORPORATION (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "FOURTEX APPARELS",
              "editable": "1"
          },
          {
              "title": "FULLMOON ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "G.I.ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "GLOBAL TECHNOLOGIES & SERVICES",
              "editable": "1"
          },
          {
              "title": "GUJRANWAL FOOD INDUSTRIES PVT LTD",
              "editable": "1"
          },
          {
              "title": "H & H MARINE PRODUCTS",
              "editable": "1"
          },
          {
              "title": "HAMID LEATHER (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "HAYAT KIMYA PAKISTAN (PRIVATE) LIMITED",
              "editable": "1"
          },
          {
              "title": "HEALTHY SALT INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "HERBION PAKISTAN (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "HOM QUALITY FOODS (PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "HUB-PAK SALT REFINERY",
              "editable": "1"
          },
          {
              "title": "HUSSAIN LEATHER CRAFT",
              "editable": "1"
          },
          {
              "title": "INDUS HOME LIMITED",
              "editable": "1"
          },
          {
              "title": "INTERNATIONAL BUSINESS HUB.",
              "editable": "1"
          },
          {
              "title": "INTERNATIONAL TEXTILE LIMITED",
              "editable": "1"
          },
          {
              "title": "J.B CORPORATION",
              "editable": "1"
          },
          {
              "title": "JAFFSON ENTERPRISES (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "JAWA INDUSTRY",
              "editable": "1"
          },
          {
              "title": "JB INDUSTRIES (GARMENT DIVISION)",
              "editable": "1"
          },
          {
              "title": "JK SPINNING MILLS LIMITED",
              "editable": "1"
          },
          {
              "title": "JUBILEE KNITWEAR INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "KARSAZ TEXTILE INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "KHADIJA INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "KOHINOOR MILLS LIMITED (DYING DIV)",
              "editable": "1"
          },
          {
              "title": "KZ HOSIERY",
              "editable": "1"
          },
          {
              "title": "LEATHER FIELD (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "LIBERMANN INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "LONGVIEW (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "LOTTE KOLSON (PVT.) LIMITED",
              "editable": "1"
          },
          {
              "title": "LUCKY TEXTILE MILLS",
              "editable": "1"
          },
          {
              "title": "M. MAQSOOD CORPORATION",
              "editable": "1"
          },
          {
              "title": "M.K KNITS",
              "editable": "1"
          },
          {
              "title": "MAGNACRETE PVT LTD",
              "editable": "1"
          },
          {
              "title": "MARVA EXPORTS",
              "editable": "1"
          },
          {
              "title": "MASS APPARELS & FABRICS (PVT) LIMITED",
              "editable": "1"
          },
          {
              "title": "MASTER MOTORS CORP (PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "MEHRAN MARBLE INDUSTRIES.",
              "editable": "1"
          },
          {
              "title": "MEHRAN MARMI INDUSTRIES PVT.",
              "editable": "1"
          },
          {
              "title": "MEHRAN SPICE & INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "METALLOGEN (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "METROTEX INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "MILESTONE TEXTILES.",
              "editable": "1"
          },
          {
              "title": "MN TEXTILES (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "MUSTAQIM DYEING",
              "editable": "1"
          },
          {
              "title": "NATIONAL REFINERY LIMITED",
              "editable": "1"
          },
          {
              "title": "NAVEENA INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "NAZEER APPARELS",
              "editable": "1"
          },
          {
              "title": "NETWORK ASIA LOGISTICS",
              "editable": "1"
          },
          {
              "title": "NEW MALIK & ASSOCIATES",
              "editable": "1"
          },
          {
              "title": "NISHAT MILLS LIMITED",
              "editable": "1"
          },
          {
              "title": "NIZAMIA APPAREL",
              "editable": "1"
          },
          {
              "title": "NUTRALFA AGRICOLE",
              "editable": "1"
          },
          {
              "title": "OOCL LOGISTICS PAKISTAN (PRIVATE) LIMITED",
              "editable": "1"
          },
          {
              "title": "PAK ARAB PIPELINE COMPANY LTD.",
              "editable": "1"
          },
          {
              "title": "PAK SUZUKI MOTOR CO LTD",
              "editable": "1"
          },
          {
              "title": "PAKISTAN ONYX MARBLE",
              "editable": "1"
          },
          {
              "title": "PAXAR PAKISTAN (PVT) LIMITED",
              "editable": "1"
          },
          {
              "title": "PELIKAN KNITWEAR",
              "editable": "1"
          },
          {
              "title": "PROCESS INDUSTRY PROCUREMENT CONSULTANTS PVT LTD",
              "editable": "1"
          },
          {
              "title": "RAUF UNIVERSAL SHIPPING",
              "editable": "1"
          },
          {
              "title": "REEMAXE GROUP OF INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "REVEL INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "ROYAL TREND",
              "editable": "1"
          },
          {
              "title": "S.AHMED GARMENTS",
              "editable": "1"
          },
          {
              "title": "S.M. TRADERS",
              "editable": "1"
          },
          {
              "title": "SAMI RAGS ENTERPRISES 74",
              "editable": "1"
          },
          {
              "title": "SANALI SPORTS",
              "editable": "1"
          },
          {
              "title": "SAPPHIRE FIBRES LTD",
              "editable": "1"
          },
          {
              "title": "SAPPHIRE FINISHING MILLS LTD",
              "editable": "1"
          },
          {
              "title": "SARENA INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "SCANZA ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "SCS EXPRESS PVT LTD",
              "editable": "1"
          },
          {
              "title": "SEA BLUE LOGISTICS",
              "editable": "1"
          },
          {
              "title": "SESIL PVT LIMITED",
              "editable": "1"
          },
          {
              "title": "SHADDAN ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "SHAFI GLUCOCHEM (PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "SHAFI TEXCEL LIMITED",
              "editable": "1"
          },
          {
              "title": "SHIP THROUGH LOGISTICS",
              "editable": "1"
          },
          {
              "title": "SK STONES (PVT) LIMITED",
              "editable": "1"
          },
          {
              "title": "SOLEHRE BROTHERS INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "SONIC TEXTILE INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "STELLA SPORTS,",
              "editable": "1"
          },
          {
              "title": "STUDIO MARK",
              "editable": "1"
          },
          {
              "title": "SULTAN C/O MR. FAISAL",
              "editable": "1"
          },
          {
              "title": "SULTEX INDUSTRIES.",
              "editable": "1"
          },
          {
              "title": "SUNTEX APPAREL INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "SUPREME RICE MILLS",
              "editable": "1"
          },
          {
              "title": "SURGICON LTD",
              "editable": "1"
          },
          {
              "title": "SYNERGY LOGISTICS PAKISTAN",
              "editable": "1"
          },
          {
              "title": "TAJ INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "TALON SPORTS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "TRANDS APPAREL",
              "editable": "1"
          },
          {
              "title": "Thread Experts",
              "editable": "1"
          },
          {
              "title": "UNITED TOWEL EXPORTERS(PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "URWA INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "USMAN & SONS",
              "editable": "1"
          },
          {
              "title": "USSK TEX",
              "editable": "1"
          },
          {
              "title": "UTOPIA INDUSTRIES PVT LTD",
              "editable": "1"
          },
          {
              "title": "UZAIR INTERNAITONAL",
              "editable": "1"
          },
          {
              "title": "Universal Logistics Services (Pvt.) Ltd.",
              "editable": "1"
          },
          {
              "title": "VISION TECHNOLOGIES CORPORATION PVT LTD",
              "editable": "1"
          },
          {
              "title": "YASHA TRADERS",
              "editable": "1"
          },
          {
              "title": "Z.R SPORTS COMPANY",
              "editable": "1"
          },
          {
              "title": "ZAHABIYA CHEMICAL INDUSTRIES.",
              "editable": "1"
          },
          {
              "title": "ZENITH TEXTILE",
              "editable": "1"
          },
          {
              "title": "ZEPHYRS TEXTILE",
              "editable": "1"
          },
          {
              "title": "ZUBISMA APPARLE",
              "editable": "1"
          },
          {
              "title": "SAEED KHAN ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "SAFAI INTERNATIONAL.",
              "editable": "1"
          },
          {
              "title": "SAFINA LOGISTICS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "SAIM MOBEEN FOOD INDUSTRIES LIMITED",
              "editable": "1"
          },
          {
              "title": "SAJJAN S/O IBRAHIM.",
              "editable": "1"
          },
          {
              "title": "SALIMUSA SPORTS",
              "editable": "1"
          },
          {
              "title": "SALMIS FURNISHERS",
              "editable": "1"
          },
          {
              "title": "SAPPHIRE FINISHING MILLS",
              "editable": "1"
          },
          {
              "title": "SARENA TEXTILE INDUSTRIES (PVT.) LTD.",
              "editable": "1"
          },
          {
              "title": "SAUDI PAK LIVE STOCK (KHURSHEED)",
              "editable": "1"
          },
          {
              "title": "SAUDI PAK LIVE STOCK (POTATO)",
              "editable": "1"
          },
          {
              "title": "SAUDI PAK LIVE STOCK MEAT CO",
              "editable": "1"
          },
          {
              "title": "SAVILLE WHITTLE INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "SAZ INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "SCHAZOO PHARMACEUTICAL",
              "editable": "1"
          },
          {
              "title": "SEA GOLD (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "SEA WAY LOGISTICS",
              "editable": "1"
          },
          {
              "title": "SEAGULL SHIPPING & LOGISTICS  (PVT)",
              "editable": "1"
          },
          {
              "title": "SERENE AIR",
              "editable": "1"
          },
          {
              "title": "SERVICE INDUSTRIES LTD",
              "editable": "1"
          },
          {
              "title": "SERVOPAK SHIPPING AGENCY",
              "editable": "1"
          },
          {
              "title": "SERVOTECH PVT LTD",
              "editable": "1"
          },
          {
              "title": "SEVEN STAR INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "SG MANUFACTURER",
              "editable": "1"
          },
          {
              "title": "SHADAB CORP",
              "editable": "1"
          },
          {
              "title": "SHAHAB GARMENTS",
              "editable": "1"
          },
          {
              "title": "SHAHEEN AIR INT'L LTD",
              "editable": "1"
          },
          {
              "title": "SHAHEEN AIR INTL LTD (2)",
              "editable": "1"
          },
          {
              "title": "SHAHID & SONS",
              "editable": "1"
          },
          {
              "title": "SHAHZAD APPARELS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "SHANCO SPORTS CORPORATION",
              "editable": "1"
          },
          {
              "title": "SHANGRILA FOODS (PRIVATE) LIMITED.",
              "editable": "1"
          },
          {
              "title": "SHEKHANI INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "SINE INTERNATIONAL (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "SITARA CHEMICAL INDS",
              "editable": "1"
          },
          {
              "title": "SKY LINKERS INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "SMA ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "SMS CHEMICAL INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "SNS IMPEX",
              "editable": "1"
          },
          {
              "title": "SPORTS CHANNEL",
              "editable": "1"
          },
          {
              "title": "SQ COMMODITIES",
              "editable": "1"
          },
          {
              "title": "STAR SHIPPING (PVT)",
              "editable": "1"
          },
          {
              "title": "STARPAK MARTIAL ARTS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "STITCH LINE APPAREL",
              "editable": "1"
          },
          {
              "title": "STYLO SHOES",
              "editable": "1"
          },
          {
              "title": "SUN INDUSTRIAL EQUIPMENT PAKISTAN",
              "editable": "1"
          },
          {
              "title": "SUNNY ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "SUNNY INT'L",
              "editable": "1"
          },
          {
              "title": "SURYA SPORTS",
              "editable": "1"
          },
          {
              "title": "SWIFT SHIPPING (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "T S MARBLE INDUSTRY",
              "editable": "1"
          },
          {
              "title": "TABO GUGOO INDUSTRIES (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "TAJ ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "TEAM FREIGHT MANAGEMENT",
              "editable": "1"
          },
          {
              "title": "TETRA PAK PAKISTAN LTD",
              "editable": "1"
          },
          {
              "title": "TEX KNIT INT",
              "editable": "1"
          },
          {
              "title": "TEX-KNIT INT",
              "editable": "1"
          },
          {
              "title": "TEXTILE CHANNEL",
              "editable": "1"
          },
          {
              "title": "TEXTILE VISION",
              "editable": "1"
          },
          {
              "title": "THE CRESCENT TEXTILE MILLS LTD",
              "editable": "1"
          },
          {
              "title": "THE INDUS HOSPITAL & HEALTH NETWORK",
              "editable": "1"
          },
          {
              "title": "THE LEATHER COMPANY",
              "editable": "1"
          },
          {
              "title": "THE ORGANIC MEAT COMPANY (PVT.) LTD",
              "editable": "1"
          },
          {
              "title": "THE SPORT STORE",
              "editable": "1"
          },
          {
              "title": "THE TREASURER",
              "editable": "1"
          },
          {
              "title": "TNG  LOGISTICS",
              "editable": "1"
          },
          {
              "title": "TRADE INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "U & I GARMENTS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "U.K MARTIAL ARTS INTERNATION",
              "editable": "1"
          },
          {
              "title": "UNI CRAFT",
              "editable": "1"
          },
          {
              "title": "UNIBIS LIMITED",
              "editable": "1"
          },
          {
              "title": "UNIBRO INDUSTRIES LTD",
              "editable": "1"
          },
          {
              "title": "UNICORP INSTRUMENT",
              "editable": "1"
          },
          {
              "title": "UNION CARGO (PRIVATE) LIMITED",
              "editable": "1"
          },
          {
              "title": "UNION FABRICS PRIVATE LIMITED",
              "editable": "1"
          },
          {
              "title": "UNIQUE ENTERPRISES (PVT.) LTD.",
              "editable": "1"
          },
          {
              "title": "UNIQUE MARITIME",
              "editable": "1"
          },
          {
              "title": "UNISHIP GLOBAL LOGISTICS",
              "editable": "1"
          },
          {
              "title": "UNISHIP GLOBAL SERVICES",
              "editable": "1"
          },
          {
              "title": "UNISHIP PAKISTAN",
              "editable": "1"
          },
          {
              "title": "UNITED TOWEL",
              "editable": "1"
          },
          {
              "title": "UNIVERSAL FREIGHT SYSTEMS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "UNIVERSAL SHIPPING",
              "editable": "1"
          },
          {
              "title": "VENUS GLOBAL LOGISTICS",
              "editable": "1"
          },
          {
              "title": "VISION AIR INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "VISION TECHNOLOGIES CORPORATION (PRIVATE) L",
              "editable": "1"
          },
          {
              "title": "WATER REGIME (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "WELCOME SHIPPING AIDS PVT LTD",
              "editable": "1"
          },
          {
              "title": "WELDON INSTRUMENTS.",
              "editable": "1"
          },
          {
              "title": "WILD ORCHARD (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "WINGS EXPRESS",
              "editable": "1"
          },
          {
              "title": "WORLD LINK SHIPPING AGENCY",
              "editable": "1"
          },
          {
              "title": "WUSQA INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "XPRESS AVIATION",
              "editable": "1"
          },
          {
              "title": "XPRESS LOGISTICES",
              "editable": "1"
          },
          {
              "title": "ZADAF ( PVT ) LTD.",
              "editable": "1"
          },
          {
              "title": "JAHANZAIB MISBAH",
              "editable": "1"
          },
          {
              "title": "JAMAL DIN LEATHER IMPEX",
              "editable": "1"
          },
          {
              "title": "JAUN ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "JEHANGIR KHAN INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "JEHANZEB MUHMAND & CO",
              "editable": "1"
          },
          {
              "title": "JOONAID CO.",
              "editable": "1"
          },
          {
              "title": "K-ELECTRIC LIMITED",
              "editable": "1"
          },
          {
              "title": "K.A. ENTERPRISES PRIVATE LIMITED",
              "editable": "1"
          },
          {
              "title": "K.B. ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "K.P INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "KAMAL TEXTILE MILLS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "KAMRAN C/O GERRY'S",
              "editable": "1"
          },
          {
              "title": "KARACHI CARGO SERVICES PVT LTD",
              "editable": "1"
          },
          {
              "title": "KAYSONS INTERNATIONAL (PVT.) L",
              "editable": "1"
          },
          {
              "title": "KHATTAK TRADERS",
              "editable": "1"
          },
          {
              "title": "KIMPEX SPORTS INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "KOHAT CEMENT COMPANY LIMITED",
              "editable": "1"
          },
          {
              "title": "KOHINOOR TEXTILES MILLS LTD",
              "editable": "1"
          },
          {
              "title": "KRISHNA SPORTS CORPORATION",
              "editable": "1"
          },
          {
              "title": "LAKHANAY SILK MILLS (PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "LASER SPORTS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "LIBERTY MILLS LIMITED",
              "editable": "1"
          },
          {
              "title": "LOGWAYS INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "LOJISTICA",
              "editable": "1"
          },
          {
              "title": "M. A. ARAIN & BROTHERS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "M.R. INDUSTRIES.",
              "editable": "1"
          },
          {
              "title": "M.T TECHNIQUES",
              "editable": "1"
          },
          {
              "title": "M.TAYYAB M.SHOAIB TRADING CORP.",
              "editable": "1"
          },
          {
              "title": "M/S BOX RING",
              "editable": "1"
          },
          {
              "title": "MACHTRADE CORPORATION",
              "editable": "1"
          },
          {
              "title": "MACRO EXPORTS",
              "editable": "1"
          },
          {
              "title": "MAHAD SPORTS WEAR",
              "editable": "1"
          },
          {
              "title": "MAHMOOD BROTHERS",
              "editable": "1"
          },
          {
              "title": "MALIK SPORTS",
              "editable": "1"
          },
          {
              "title": "MAMA",
              "editable": "1"
          },
          {
              "title": "MAP ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "MAQSOOD TRADERS",
              "editable": "1"
          },
          {
              "title": "MAROOF INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "MASHRIQ GEMS.",
              "editable": "1"
          },
          {
              "title": "MASTER TEXTILE MILLS LIMITED",
              "editable": "1"
          },
          {
              "title": "MAVRK JEANS INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "MAXPEED SHIPPING & LOGISTICS",
              "editable": "1"
          },
          {
              "title": "MEDISPOREX (PRIVATE) LIMITED",
              "editable": "1"
          },
          {
              "title": "MEHAR CARGO (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "MEHER AND CO",
              "editable": "1"
          },
          {
              "title": "METAL MASTERS",
              "editable": "1"
          },
          {
              "title": "MINZI INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "MISC. (PERSONAL BAGG/EFECT)",
              "editable": "1"
          },
          {
              "title": "MISL",
              "editable": "1"
          },
          {
              "title": "MISTIQUBE",
              "editable": "1"
          },
          {
              "title": "MOHSIN TEXTILE",
              "editable": "1"
          },
          {
              "title": "MRS RAFIKA ABDUL KHALIQ",
              "editable": "1"
          },
          {
              "title": "MRS. AZRA ASIF SATTAR",
              "editable": "1"
          },
          {
              "title": "MS HINA SHARIQ / C/O SHAHID SAHAB",
              "editable": "1"
          },
          {
              "title": "MUEED ESTABLISHMENT",
              "editable": "1"
          },
          {
              "title": "MUHAMMAD NAWAZ",
              "editable": "1"
          },
          {
              "title": "MUSHKO PRINTING SOLUTIONS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "MUSHTAQ INTERNATIONAL TRADERS",
              "editable": "1"
          },
          {
              "title": "MUSTAFA & COMPANY (PVT.) LTD.",
              "editable": "1"
          },
          {
              "title": "MUSTAQIM DYING & PRINTING INDUSTRIES PVT LTD",
              "editable": "1"
          },
          {
              "title": "MUTABAL FOOD LTD",
              "editable": "1"
          },
          {
              "title": "MY CARGO",
              "editable": "1"
          },
          {
              "title": "MY LOGISTICS",
              "editable": "1"
          },
          {
              "title": "NABIQASIM INDUSTRIES PVT LIMITED",
              "editable": "1"
          },
          {
              "title": "NAIZMH ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "NASARUN EXPORTS",
              "editable": "1"
          },
          {
              "title": "NAUTILUS GLOBAL MARINE SERVICES",
              "editable": "1"
          },
          {
              "title": "NAVEENA EXPORTS LIMITED",
              "editable": "1"
          },
          {
              "title": "NFK EXPORTS ( PVT ) LTD",
              "editable": "1"
          },
          {
              "title": "NIAZ GARMENTS INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "NOOR SONS",
              "editable": "1"
          },
          {
              "title": "NOSH FOOD INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "NOVA INTERNATIONAL PVT LTD",
              "editable": "1"
          },
          {
              "title": "NOVA LEATHER",
              "editable": "1"
          },
          {
              "title": "OHRENMANN CARPET PALACE.",
              "editable": "1"
          },
          {
              "title": "ORGANO BOTANICA",
              "editable": "1"
          },
          {
              "title": "ORIENT CARGO SERVICES",
              "editable": "1"
          },
          {
              "title": "ORIENT TEXTILE MILLS LIMTED",
              "editable": "1"
          },
          {
              "title": "PACIFIC FREIGHT SYSTEM(PVT)LTD",
              "editable": "1"
          },
          {
              "title": "PAK APPARELS",
              "editable": "1"
          },
          {
              "title": "PAK AVIATION ENGINEERING SRVS (2)",
              "editable": "1"
          },
          {
              "title": "PAK HYDRAULIC & TRADING CO",
              "editable": "1"
          },
          {
              "title": "PAK MINES INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "PAK VEGETABLES & FRUITS",
              "editable": "1"
          },
          {
              "title": "PAKISTAN AIR FORCE",
              "editable": "1"
          },
          {
              "title": "PAKISTAN INTERNATIONAL AIRLINE CORP",
              "editable": "1"
          },
          {
              "title": "PARAMOUNT TRADING CO",
              "editable": "1"
          },
          {
              "title": "PCS LOGISTICS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "PEARL SCAFFOLD",
              "editable": "1"
          },
          {
              "title": "PELLE CLASSICS",
              "editable": "1"
          },
          {
              "title": "PENNA OVERSEAS CORP",
              "editable": "1"
          },
          {
              "title": "PERFECT ASSOCIATES",
              "editable": "1"
          },
          {
              "title": "PREMIER TRADERS",
              "editable": "1"
          },
          {
              "title": "PRIME COAT PVT LTD",
              "editable": "1"
          },
          {
              "title": "PROHAND INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "PROLINE (PVT) LIMITED",
              "editable": "1"
          },
          {
              "title": "PUNJAB THERMAL POWER PVT LTD",
              "editable": "1"
          },
          {
              "title": "QUALITY DYEING & FINISHING",
              "editable": "1"
          },
          {
              "title": "QUALITY EXPORT INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "QUICE FOOD INDUSTRIES LIMITED",
              "editable": "1"
          },
          {
              "title": "R.J INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "RABI ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "RAJA BROTHERS",
              "editable": "1"
          },
          {
              "title": "RAJWANI APPAREL (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "RAJWANI DENIM MILLS (PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "RANI & COMPANY",
              "editable": "1"
          },
          {
              "title": "REAL STAR SURGICAL INSTRUMENTS",
              "editable": "1"
          },
          {
              "title": "REHMAT E SHEREEN",
              "editable": "1"
          },
          {
              "title": "RELIANCE COTTON SPINNING MILLS LTD",
              "editable": "1"
          },
          {
              "title": "RIMMER INDUSTRIES (REGD)",
              "editable": "1"
          },
          {
              "title": "RISHAD MATEEN & CO",
              "editable": "1"
          },
          {
              "title": "RISING SPORTSWEAR",
              "editable": "1"
          },
          {
              "title": "ROSHAN ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "ROWER SPORTS",
              "editable": "1"
          },
          {
              "title": "RUBY COLLECTION",
              "editable": "1"
          },
          {
              "title": "S M DENIM MILLS",
              "editable": "1"
          },
          {
              "title": "S.SAQLAINIA ENTERPRISE (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "SAARUNG SHIPPING",
              "editable": "1"
          },
          {
              "title": "SACHIN SPORTS INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "A. L. GARMENTS",
              "editable": "1"
          },
          {
              "title": "A.H TRADERS",
              "editable": "1"
          },
          {
              "title": "A.I.R INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "A.J WORLDWIDE SERVICE PAKISTAN (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "A.O ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "AFRAZ KNIT & STITCH PVT LTD",
              "editable": "1"
          },
          {
              "title": "AGRO HUB INTERNATIONAL (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "AL AMIN EXPORT",
              "editable": "1"
          },
          {
              "title": "AL KARAM TOWEL INDUSTRIES PVT LTD",
              "editable": "1"
          },
          {
              "title": "AL-HAMDOLILLAH EXPORTS",
              "editable": "1"
          },
          {
              "title": "ALI TRADING COMPANY (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "AMANIA SUPPORT SERVICES SMC (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "ARMS SNACKS FOODS",
              "editable": "1"
          },
          {
              "title": "AFROZE TEXTILE IND (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "AIR BLUE LTD",
              "editable": "1"
          },
          {
              "title": "AIRSIAL ENGINEERING & MAINTENANCE",
              "editable": "1"
          },
          {
              "title": "AL HUSNAIN ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "AL HUSSAIN TRADRES",
              "editable": "1"
          },
          {
              "title": "AL MASAOOD OIL INDUSTRY SUPPLIES & SERVICES CO",
              "editable": "1"
          },
          {
              "title": "AL REHMAN GLOBAL TEX (PVT) LIMITED,",
              "editable": "1"
          },
          {
              "title": "AL SUBUK ENGINEERING ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "AL-AZEEM ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "AL-FALAH IMPEX",
              "editable": "1"
          },
          {
              "title": "AL-MEENA MARINE ENGINEERS",
              "editable": "1"
          },
          {
              "title": "AL-SIDDIQ CONSOLIDATOR (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "AL-TAYYIBA APPAREL",
              "editable": "1"
          },
          {
              "title": "ALAM INTERNATIONAL TRADERS",
              "editable": "1"
          },
          {
              "title": "ALI TRADING Co (Pvt) Ltd.",
              "editable": "1"
          },
          {
              "title": "AM LOGISTIC",
              "editable": "1"
          },
          {
              "title": "AM TECHNOLOGIES",
              "editable": "1"
          },
          {
              "title": "AMANULLAH ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "AMBALA EXPORT TRADING CO",
              "editable": "1"
          },
          {
              "title": "ANAS TROPICAL PRU & VEG EXPORT",
              "editable": "1"
          },
          {
              "title": "ANDREW PAINTS",
              "editable": "1"
          },
          {
              "title": "AQSA INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "ARABIAN ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "ARIES LOGISTICS (PVT) LIMITED",
              "editable": "1"
          },
          {
              "title": "ARSAM SPORTS",
              "editable": "1"
          },
          {
              "title": "ART LOGISTICS",
              "editable": "1"
          },
          {
              "title": "ARTISAN TEXTILE",
              "editable": "1"
          },
          {
              "title": "ARZOO TEXTILES MILLS LIMITED",
              "editable": "1"
          },
          {
              "title": "ASIA POULTRY FEEDS PVT LTD",
              "editable": "1"
          },
          {
              "title": "ASSAC CARPETS",
              "editable": "1"
          },
          {
              "title": "ASTUTE SPORTS",
              "editable": "1"
          },
          {
              "title": "ATROX INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "ATTOCK REFINERY LIMITED",
              "editable": "1"
          },
          {
              "title": "AWAN SPORTS INDUSTRIES PVT LTD",
              "editable": "1"
          },
          {
              "title": "BACO INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "BALMEERA INTERTRADE",
              "editable": "1"
          },
          {
              "title": "BARKET FIRTILIZERS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "BILAL & COMPANY",
              "editable": "1"
          },
          {
              "title": "BOLA GEMA- PAKISTAN",
              "editable": "1"
          },
          {
              "title": "BOX RING",
              "editable": "1"
          },
          {
              "title": "BRIGHT SAIL PAKISTAN",
              "editable": "1"
          },
          {
              "title": "BROTHERS PRODUCTION PVT LTD.",
              "editable": "1"
          },
          {
              "title": "BUKSH CARPET",
              "editable": "1"
          },
          {
              "title": "BUREAU VERITAS PAKISTAN PVT LTD",
              "editable": "1"
          },
          {
              "title": "CAPITAL SPORTS CORPORATION (PVT)",
              "editable": "1"
          },
          {
              "title": "CARGO AND COMMODITIES PVT LTD",
              "editable": "1"
          },
          {
              "title": "CARGO CRYSTAL (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "CARGO TRACK",
              "editable": "1"
          },
          {
              "title": "CASUAL CLOTHING CO",
              "editable": "1"
          },
          {
              "title": "CELERITY SUPPLY CHAIN (PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "CENTRAL ORDINANCE AVIATION DEPOT",
              "editable": "1"
          },
          {
              "title": "CHADHARY IJAZ AHMAD & SONS",
              "editable": "1"
          },
          {
              "title": "CHEEMA BROTHERS",
              "editable": "1"
          },
          {
              "title": "CHENAB APPAREL (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "CHT PAKISTAN (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "CIVIL AVIATION AUTHORITY",
              "editable": "1"
          },
          {
              "title": "COMBINED LOGISTICS INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "COMET SPORTS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "COMMANDING OFFICER",
              "editable": "1"
          },
          {
              "title": "COMPANION SERVICES",
              "editable": "1"
          },
          {
              "title": "CONSOLIDATION SHIPPING &",
              "editable": "1"
          },
          {
              "title": "CONTINENTAL TEXTILES (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "CORAL ENTERPRISES (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "COTTON CLUB",
              "editable": "1"
          },
          {
              "title": "CROSS WEAR",
              "editable": "1"
          },
          {
              "title": "D.G. Khan Cement Co. Ltd",
              "editable": "1"
          },
          {
              "title": "DANISH TRADERS",
              "editable": "1"
          },
          {
              "title": "DAWOOD MEAT COMPANY (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "DEEPSEA",
              "editable": "1"
          },
          {
              "title": "DELTEX",
              "editable": "1"
          },
          {
              "title": "DIGITAL APPAREL (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "DIGRACIA KNITS",
              "editable": "1"
          },
          {
              "title": "DISTRICT CONTROLLER OF STORES",
              "editable": "1"
          },
          {
              "title": "DIVINE LOGISTICS INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "DYNAMIC TOOLING SERVICES",
              "editable": "1"
          },
          {
              "title": "E2E SUPPLY CHAIN MANAGMENT (PVT) LT",
              "editable": "1"
          },
          {
              "title": "EASTWAY GLOBAL FORWARDING LTD",
              "editable": "1"
          },
          {
              "title": "ECU LINE PAKISTAN (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "EESHOO TOYS",
              "editable": "1"
          },
          {
              "title": "ELEGANT Co",
              "editable": "1"
          },
          {
              "title": "ENGINEERING SOLUTIONS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "ENGRO POWERGEN QADIRPUR LIMITED",
              "editable": "1"
          },
          {
              "title": "EURO SUPPLY CHAIN & LOGISTICS SERVICES",
              "editable": "1"
          },
          {
              "title": "EUROTEX",
              "editable": "1"
          },
          {
              "title": "F.E.B INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "FAHAD INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "FAIRDEAL MILLS (PVT) LIMITED",
              "editable": "1"
          },
          {
              "title": "FAISAL FABRICS LTD",
              "editable": "1"
          },
          {
              "title": "FAISAL SPINNING MILLS LTD FINISHING UNIT",
              "editable": "1"
          },
          {
              "title": "FAST & FINE CARGO SERVICES",
              "editable": "1"
          },
          {
              "title": "FAST FLY IMPEX",
              "editable": "1"
          },
          {
              "title": "FATIMA WEAVING MILLS (PVT)LTD",
              "editable": "1"
          },
          {
              "title": "FAUJI FRESH N FREEZE LIMITED",
              "editable": "1"
          },
          {
              "title": "FAZAL CLOTH MILLS LIMITED",
              "editable": "1"
          },
          {
              "title": "FAZAL REHMAN FABRICS LIMITED",
              "editable": "1"
          },
          {
              "title": "FILTRADER PVT LTD",
              "editable": "1"
          },
          {
              "title": "FINE COTTON TEXTILES.,",
              "editable": "1"
          },
          {
              "title": "FOODEX",
              "editable": "1"
          },
          {
              "title": "FORCE FIVE PVT LTD.",
              "editable": "1"
          },
          {
              "title": "FORTE LOGISTICS SOLUTIONS",
              "editable": "1"
          },
          {
              "title": "G.M FASHION",
              "editable": "1"
          },
          {
              "title": "GARATEX",
              "editable": "1"
          },
          {
              "title": "GETZ PHARMA (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "GLOBAL CORPORATION",
              "editable": "1"
          },
          {
              "title": "GLOBAL LOGISTICS INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "GLOBE X LOGISTICS",
              "editable": "1"
          },
          {
              "title": "GLOBELINK PAKISTAN (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "GLOW PAK INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "GOLD & SILVER TITANIUM IND",
              "editable": "1"
          },
          {
              "title": "GREEN BRIDGE ENTERPRISE",
              "editable": "1"
          },
          {
              "title": "GUL AHMED TEXTILE MILLS LTD",
              "editable": "1"
          },
          {
              "title": "GULF CHEMICALS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "HADI RASHEED SAIYID",
              "editable": "1"
          },
          {
              "title": "HAFIZ TANNERY",
              "editable": "1"
          },
          {
              "title": "HAFIZ TANNERY (IMPORT)",
              "editable": "1"
          },
          {
              "title": "HAMZA ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "HANA CARPETS",
              "editable": "1"
          },
          {
              "title": "HANZ TILES & CERAMICS",
              "editable": "1"
          },
          {
              "title": "HASHI CORPORATION",
              "editable": "1"
          },
          {
              "title": "HASNAIN CARGO SERVICES",
              "editable": "1"
          },
          {
              "title": "HASSAN INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "HI JEANS",
              "editable": "1"
          },
          {
              "title": "HIGHWAY LOGISTICS",
              "editable": "1"
          },
          {
              "title": "HONEST FOOD PRODUCTS",
              "editable": "1"
          },
          {
              "title": "HORIZAN MFG CO",
              "editable": "1"
          },
          {
              "title": "IBRAHIM ASSOCIATES",
              "editable": "1"
          },
          {
              "title": "IDREES (CARGO LINKERS)",
              "editable": "1"
          },
          {
              "title": "IEDGE",
              "editable": "1"
          },
          {
              "title": "IMRAN BROTHERS.",
              "editable": "1"
          },
          {
              "title": "IMTCO PAKISTAN",
              "editable": "1"
          },
          {
              "title": "INDEPENDENT OIL TOOLS",
              "editable": "1"
          },
          {
              "title": "INT'L AIR & SEA CARGO SERVICES",
              "editable": "1"
          },
          {
              "title": "INT'L TEXTILE DISTRIBUTORS INC",
              "editable": "1"
          },
          {
              "title": "INTER FREIGHT",
              "editable": "1"
          },
          {
              "title": "INTER FREIGHT - SAJID",
              "editable": "1"
          },
          {
              "title": "INTERNATIONAL BUSINESS CENTRE",
              "editable": "1"
          },
          {
              "title": "INTERNATIONAL BUSINESS CENTRE.",
              "editable": "1"
          },
          {
              "title": "INTERNATIONAL CARGO MANAGEMENT (ICM)",
              "editable": "1"
          },
          {
              "title": "IRAN & BUKHARA PALACE",
              "editable": "1"
          },
          {
              "title": "IRON FIST IMPEX (PRIVATE) LIMITED",
              "editable": "1"
          },
          {
              "title": "ISMAIL SPORTS GARMENTS IND",
              "editable": "1"
          },
          {
              "title": "ITD TEXTILES (PVT.) LIMITED.",
              "editable": "1"
          },
          {
              "title": "JAFFER AGRO SERVICES (PVT) LIMITED",
              "editable": "1"
          },
          {
              "title": "JAGTEX (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "KAYSONS INTERNATIONAL (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "AL-GHOSIA IND",
              "editable": "1"
          },
          {
              "title": "ITTEFAQ TRADING CO.",
              "editable": "1"
          },
          {
              "title": "PAKISTAN INTERNATIONAL AIRLINES CORPORATION",
              "editable": "1"
          },
          {
              "title": "PROLINE (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "SAAR INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "Sadaf Enterprises",
              "editable": "1"
          },
          {
              "title": "SOORTY ENTERPRIES",
              "editable": "1"
          },
          {
              "title": "IMRAN BROTHERS TEXTILE (PRIVATE) LIMITED",
              "editable": "1"
          },
          {
              "title": "REPSTER WEARS",
              "editable": "1"
          },
          {
              "title": "RAJCO INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "NUTEX INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "FAISAL FABRICS LTD.",
              "editable": "1"
          },
          {
              "title": "A.L. GARMENTS",
              "editable": "1"
          },
          {
              "title": "SIDDIQSONS LIMITED",
              "editable": "1"
          },
          {
              "title": "THE DESIGNER",
              "editable": "1"
          },
          {
              "title": "EASTERN SPINNING MILLS LILMITED",
              "editable": "1"
          },
          {
              "title": "NAWAZ FABRICS",
              "editable": "1"
          },
          {
              "title": "B A TEXTILE",
              "editable": "1"
          },
          {
              "title": "TULIP TOWEL IND (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "PERFECT FOOD INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "THREAD CONNECT",
              "editable": "1"
          },
          {
              "title": "DURRANI ASSOCIATES",
              "editable": "1"
          },
          {
              "title": "HANA CARPET",
              "editable": "1"
          },
          {
              "title": "SUNRISE ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "BLUEJET ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "SUBLI MASTER",
              "editable": "1"
          },
          {
              "title": "CAAV GROUP",
              "editable": "1"
          },
          {
              "title": "STITCHWELL GARMENTS",
              "editable": "1"
          },
          {
              "title": "A.K ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "A.Y LEATHER",
              "editable": "1"
          },
          {
              "title": "AAS MOVING",
              "editable": "1"
          },
          {
              "title": "ABDUR RAHMAN CORPORATION (PVT) LIMITED",
              "editable": "1"
          },
          {
              "title": "ABID TEXTILE",
              "editable": "1"
          },
          {
              "title": "ADNAN APPAREL",
              "editable": "1"
          },
          {
              "title": "AERO EXPRESS INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "AERTEX ENTERPRISES.",
              "editable": "1"
          },
          {
              "title": "SHARIF & ELAHI CORPORATION",
              "editable": "1"
          },
          {
              "title": "M.N. TEXTILES (PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "SONIC TEXTILE INDUSTRIES (PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "DANIYAL ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "LEATHER COORDINATOR",
              "editable": "1"
          },
          {
              "title": "MAHEEN TEXTILE MILLS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "LANAM INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "CREST ARTCRAFT",
              "editable": "1"
          },
          {
              "title": "AIR & SEA LOGISTICS",
              "editable": "1"
          },
          {
              "title": "ENGLISH FASHION.",
              "editable": "1"
          },
          {
              "title": "Hilal Foods (Pvt.) Ltd.",
              "editable": "1"
          },
          {
              "title": "GLS INTL.",
              "editable": "1"
          },
          {
              "title": "A.R. HOSIERY WORKS",
              "editable": "1"
          },
          {
              "title": "HERMAIN ENTERPRISE",
              "editable": "1"
          },
          {
              "title": "ALLIED TRADING CORPORATION",
              "editable": "1"
          },
          {
              "title": "LUCERNA TRADING DMCC C/OF: ABM INFO TECH (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "CARGO SOLUTION SERVICES",
              "editable": "1"
          },
          {
              "title": "WORLD G CORPORATION",
              "editable": "1"
          },
          {
              "title": "H.NIZAM DIN AND SONS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "ANSA INDUSTRIES.",
              "editable": "1"
          },
          {
              "title": "SCS EXPRESS PVT LTD CUSTOMER",
              "editable": "1"
          },
          {
              "title": "SPONA SPORTS.",
              "editable": "1"
          },
          {
              "title": "AHMED FINE WEAVING LTD.,",
              "editable": "1"
          },
          {
              "title": "COLONY TEXTILE MILLS LIMITED",
              "editable": "1"
          },
          {
              "title": "NISHAT (CHUNIAN) LIMITED",
              "editable": "1"
          },
          {
              "title": "ROBIQA ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "FIRST STONE CORPORATION PVT LTD",
              "editable": "1"
          },
          {
              "title": "MARK ONE SURGICAL",
              "editable": "1"
          },
          {
              "title": "SAMZ APPAREL ( PVT) LTD",
              "editable": "1"
          },
          {
              "title": "SUNRISE EXPORTS",
              "editable": "1"
          },
          {
              "title": "FULLMOON ENTERPRISES.",
              "editable": "1"
          },
          {
              "title": "PAKISTAN NAVY C/O COMMANDING OFFICER",
              "editable": "1"
          },
          {
              "title": "SHAFI LIFESTYLE (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "Raheel Amanullah",
              "editable": "1"
          },
          {
              "title": "ABDUL WASI ULFAT S/O ABDUL HADI ULFAT",
              "editable": "1"
          },
          {
              "title": "DARSON INDUSTRIES (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "WITTVOLK EUROPE INTERNATIONAL GENERAL TRADING LLC",
              "editable": "1"
          },
          {
              "title": "GE HYDRO FRANCE",
              "editable": "1"
          },
          {
              "title": "AL TAYYIBA APPAREL.,",
              "editable": "1"
          },
          {
              "title": "JAGUAR APPAREL (PRIVATE) LIMITED",
              "editable": "1"
          },
          {
              "title": "SULTANIA GARMENTS",
              "editable": "1"
          },
          {
              "title": "DANCO FRESH",
              "editable": "1"
          },
          {
              "title": "NUTRALFA PRIVATE LIMITED",
              "editable": "1"
          },
          {
              "title": "EMBASSY OF DENMARK.",
              "editable": "1"
          },
          {
              "title": "F.B. INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "AL-MADINAH ISLAMIC RESEARCH CENTRE",
              "editable": "1"
          },
          {
              "title": "TAHIR CARPETS",
              "editable": "1"
          },
          {
              "title": "AERTEX SPORTS",
              "editable": "1"
          },
          {
              "title": "ARRIZA GROUP",
              "editable": "1"
          },
          {
              "title": "THE ORGANIC MEAT COMPANY",
              "editable": "1"
          },
          {
              "title": "RANS INTL FREIGHT FOWARDING CO",
              "editable": "1"
          },
          {
              "title": "QST INTERNATIONAL.",
              "editable": "1"
          },
          {
              "title": "JAGUAR APPAREL (PRIVATE) LIMITED.",
              "editable": "1"
          },
          {
              "title": "TROUT APPAREL",
              "editable": "1"
          },
          {
              "title": "TRIMCO PAKISTAN (PRIVATE) LIMITED",
              "editable": "1"
          },
          {
              "title": "NLC MARINE & AIR SERVICES.",
              "editable": "1"
          },
          {
              "title": "DALDA FOODS LIMITED.",
              "editable": "1"
          },
          {
              "title": "MEZAN TEA (PRIVATE) LIMITED",
              "editable": "1"
          },
          {
              "title": "THE PARACHA TEXTILE MILLS LTD",
              "editable": "1"
          },
          {
              "title": "JAVED AHMED KAIMKHANI",
              "editable": "1"
          },
          {
              "title": "JAY + ENN SAFETY",
              "editable": "1"
          },
          {
              "title": "THAR COAL BLOCK-1 POWER GENERATION COMPANY (PVT) L",
              "editable": "1"
          },
          {
              "title": "SNA TRADERS.CO",
              "editable": "1"
          },
          {
              "title": "HUGO SPORT PAK",
              "editable": "1"
          },
          {
              "title": "STITCHWELL GARMENTS.",
              "editable": "1"
          },
          {
              "title": "ROOMI FABRICS LIMITED",
              "editable": "1"
          },
          {
              "title": "MASOOD FABRICS LIMITED.",
              "editable": "1"
          },
          {
              "title": "UNIVERSAL CABLES INDUSTRIES LIMITED",
              "editable": "1"
          },
          {
              "title": "KHALID OVERSEAS CORPORATION",
              "editable": "1"
          },
          {
              "title": "NAZ TEXTILES (PVT) LIMITED",
              "editable": "1"
          },
          {
              "title": "CENTRAL SURGICAL CO. (PVT) LTD.,",
              "editable": "1"
          },
          {
              "title": "GOHAR TEXTILE MILLS PVT LTD",
              "editable": "1"
          },
          {
              "title": "PERFECT GLOVES MANUFACTURER CO (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "ABRAR ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "ECO GREEN / UK COURIER",
              "editable": "1"
          },
          {
              "title": "CRETESOL (PRIVATE) LIMITED",
              "editable": "1"
          },
          {
              "title": "AOL APPAREL PRIVATE LIMITED",
              "editable": "1"
          },
          {
              "title": "Muhammad Jahangir Enterprises",
              "editable": "1"
          },
          {
              "title": "RANA IMPEX",
              "editable": "1"
          },
          {
              "title": "Blow Plast (Pvt) Limited",
              "editable": "1"
          },
          {
              "title": "PAK FASHEO CLOTHING COMPANY",
              "editable": "1"
          },
          {
              "title": "IMRAN @ ALLIED LOG",
              "editable": "1"
          },
          {
              "title": "ANABIA GARMENTS",
              "editable": "1"
          },
          {
              "title": "ASK SHIPPING AND LOGISTICS",
              "editable": "1"
          },
          {
              "title": "PIK PAK INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "QASIM INTERNATIONAL CONTAINER TERMINAL PAKISTAN LT",
              "editable": "1"
          },
          {
              "title": "Jilani Shipping International",
              "editable": "1"
          },
          {
              "title": "SHEIKH MUHAMMAD SAEED & SONS",
              "editable": "1"
          },
          {
              "title": "ADAMJEE ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "SHAN CARGO",
              "editable": "1"
          },
          {
              "title": "MASUM LOGISTICS",
              "editable": "1"
          },
          {
              "title": "CASUAL CLOTHING CO.",
              "editable": "1"
          },
          {
              "title": "KITARIYA BROTHERS",
              "editable": "1"
          },
          {
              "title": "VELOCITY SOLUTIONS",
              "editable": "1"
          },
          {
              "title": "GLOBEX SAFETY (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "SUNSHINE GLOVES",
              "editable": "1"
          },
          {
              "title": "AK GROUP",
              "editable": "1"
          },
          {
              "title": "PERFORMANCE SURGICAL INSTRUMENTS",
              "editable": "1"
          },
          {
              "title": "ZIL LIMITED",
              "editable": "1"
          },
          {
              "title": "TEKNOKRAT",
              "editable": "1"
          },
          {
              "title": "ECOM LOGISTIX",
              "editable": "1"
          },
          {
              "title": "REMO SPORTS",
              "editable": "1"
          },
          {
              "title": "CONTINENTAL TOWELS  (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "KUMAIL GLOVES INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "CMYK SERVICES",
              "editable": "1"
          },
          {
              "title": "GILLANI INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "MUSTHAFA IMRAN AHMED",
              "editable": "1"
          },
          {
              "title": "PETRO SOURCING (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "CARE MEDICAL SUPPLIES",
              "editable": "1"
          },
          {
              "title": "ALPINE INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "MDS COMPANY",
              "editable": "1"
          },
          {
              "title": "KARIMA TEXTILE RECYCLER (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "RAVI ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "FAISAL SPINNING MILLS TLD",
              "editable": "1"
          },
          {
              "title": "GHANI GLASS LIMITED",
              "editable": "1"
          },
          {
              "title": "CP PAKISTAN",
              "editable": "1"
          },
          {
              "title": "LIGHT PAK GLOBAL INDUSTRIES (PRIVATE) LIMITED",
              "editable": "1"
          },
          {
              "title": "ARTISTIC MILLINERS (PVT) LTD",
              "editable": "1"
          }
      ]
  },
  {
      "title": "ADVANCES TO DIRECTORS",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": [
          {
              "title": "DIRECTOR 1",
              "editable": "1"
          },
          {
              "title": "DIRECTOR 2",
              "editable": "1"
          }
      ]
  },
  {
      "title": "ADVANCES TO BRANCHES",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": []
  },
  {
      "title": "ADVANCES & PREPAYMENTS",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": [
          {
              "title": "SECURITY DEPOSIT",
              "editable": "1"
          },
          {
              "title": "ADVANCE OFFICE RENT",
              "editable": "1"
          },
          {
              "title": "MULTINATE   (INTERNET)",
              "editable": "1"
          },
          {
              "title": "LEASE DEPOSITS",
              "editable": "1"
          },
          {
              "title": "PTC",
              "editable": "1"
          },
          {
              "title": "STANDARD SERVICE",
              "editable": "1"
          },
          {
              "title": "FUEL DEPOSIT",
              "editable": "1"
          },
          {
              "title": "CONTAINER DEPOSITS",
              "editable": "1"
          },
          {
              "title": "Sea Net Shipping (LLC)",
              "editable": "1"
          },
          {
              "title": "PIA Advance A/C",
              "editable": "1"
          },
          {
              "title": "P.I.A BID / TENDER ADVANCE A/C",
              "editable": "1"
          },
          {
              "title": "SAUDI ARABIA AIRLINE ADVANCE",
              "editable": "1"
          },
          {
              "title": "ADVACE TO INTER-FRET CONSOLIDATOR",
              "editable": "1"
          },
          {
              "title": "ADVANCE TO MEHR CARGO (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "FARAZ IOU",
              "editable": "1"
          }
      ]
  },
  {
      "title": "ADVANCES TO STAFF",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": [
          {
              "title": "STAFF A",
              "editable": "1"
          },
          {
              "title": "SHAFIULLAH (ACCOUNTS)",
              "editable": "1"
          },
          {
              "title": "RASHID EHSAN",
              "editable": "1"
          },
          {
              "title": "IKRAM LOADER",
              "editable": "1"
          },
          {
              "title": "SALMAN AZIZ STAFF",
              "editable": "1"
          },
          {
              "title": "AZHAR HUSSAIN (O/D)",
              "editable": "1"
          },
          {
              "title": "IFTIKHAR AHMED (O/D)",
              "editable": "1"
          },
          {
              "title": "MUHAMMAD SAAD",
              "editable": "1"
          },
          {
              "title": "MUBASHIR HUSSAIN",
              "editable": "1"
          },
          {
              "title": "AKHTAR A. HAQUE",
              "editable": "1"
          },
          {
              "title": "ATHAR A. HAQUE",
              "editable": "1"
          },
          {
              "title": "SUNIL (SUNNY ENTERPRISES)",
              "editable": "1"
          },
          {
              "title": "SHAHID SIDDIQUI (ADV)",
              "editable": "1"
          },
          {
              "title": "BILAL AHMED (LHE STAFF) SNSL",
              "editable": "1"
          },
          {
              "title": "MUHAMMAD HANIF (CARGO LINKERS)",
              "editable": "1"
          },
          {
              "title": "GHAZANFER (AIRPORT)",
              "editable": "1"
          },
          {
              "title": "M. MURSALEEN IBRAHIM",
              "editable": "1"
          },
          {
              "title": "FARAH SALEEM (ADVANCE)",
              "editable": "1"
          },
          {
              "title": "SHURUQ ANJUM (ADVANCE)",
              "editable": "1"
          },
          {
              "title": "ZUBAIR O/D (ADVANCE)",
              "editable": "1"
          },
          {
              "title": "BABOO SWEEPER (ADVANCE)",
              "editable": "1"
          },
          {
              "title": "ZAIN UL ABDIN O/D",
              "editable": "1"
          },
          {
              "title": "M.SALMAN",
              "editable": "1"
          },
          {
              "title": "MUHAMMAD IRFAN (SEA)",
              "editable": "1"
          },
          {
              "title": "ALI NAEEM",
              "editable": "1"
          },
          {
              "title": "GHULAM HUSSAIN",
              "editable": "1"
          },
          {
              "title": "IMRAN SB TURKISH AIRLLINES",
              "editable": "1"
          },
          {
              "title": "FAISAL YAMIN",
              "editable": "1"
          },
          {
              "title": "IRSA KAMRAN",
              "editable": "1"
          },
          {
              "title": "OFFICE DRIVER  (ARSHAD)",
              "editable": "1"
          },
          {
              "title": "SAAD ALI BUTT",
              "editable": "1"
          },
          {
              "title": "WAQAS ( AIR DEPT",
              "editable": "1"
          },
          {
              "title": "MUHAMMAD ARSALAN",
              "editable": "1"
          },
          {
              "title": "REHAN AHMED",
              "editable": "1"
          },
          {
              "title": "NASIR DRIVER",
              "editable": "1"
          },
          {
              "title": "NAZNEEN SYED",
              "editable": "1"
          },
          {
              "title": "FIZA SYED",
              "editable": "1"
          },
          {
              "title": "SADIA KHAN",
              "editable": "1"
          },
          {
              "title": "RENEE MITCHEL",
              "editable": "1"
          },
          {
              "title": "SYED KHURSHEED",
              "editable": "1"
          },
          {
              "title": "M. HAMID",
              "editable": "1"
          },
          {
              "title": "ZAFAR SB CL",
              "editable": "1"
          },
          {
              "title": "ABDUL RASHID",
              "editable": "1"
          },
          {
              "title": "ASAD ALI",
              "editable": "1"
          },
          {
              "title": "IMRAN MUSTAFA",
              "editable": "1"
          },
          {
              "title": "SHERYAR",
              "editable": "1"
          },
          {
              "title": "KASHIF MALIK",
              "editable": "1"
          },
          {
              "title": "FARAZ",
              "editable": "1"
          },
          {
              "title": "ABDUL GHAFFAR",
              "editable": "1"
          },
          {
              "title": "MUHAMMAD SABIR",
              "editable": "1"
          },
          {
              "title": "IBRAHEEM",
              "editable": "1"
          },
          {
              "title": "OWAIS RAZA",
              "editable": "1"
          },
          {
              "title": "ZEESHAN UL HAQ",
              "editable": "1"
          },
          {
              "title": "ANAS SIDDIQUI",
              "editable": "1"
          },
          {
              "title": "EJAZ HASHMI",
              "editable": "1"
          },
          {
              "title": "MUSTAFA (Watchman)",
              "editable": "1"
          },
          {
              "title": "ALI AKBER (Office Boy)",
              "editable": "1"
          },
          {
              "title": "SHAREEF (Office Boy)",
              "editable": "1"
          },
          {
              "title": "SHAKIL UR REHMAN",
              "editable": "1"
          },
          {
              "title": "ASIF (PEON)",
              "editable": "1"
          },
          {
              "title": "NASIR (AIRPORT)",
              "editable": "1"
          },
          {
              "title": "HAIDER (SEA DEPT)",
              "editable": "1"
          },
          {
              "title": "ABDUL REHMAN",
              "editable": "1"
          },
          {
              "title": "MOHSIN BAIG (BOSS FRND)",
              "editable": "1"
          },
          {
              "title": "NOMAN (AIR DEPT)",
              "editable": "1"
          },
          {
              "title": "Hafeez",
              "editable": "1"
          },
          {
              "title": "Ali Sabir Shah",
              "editable": "1"
          },
          {
              "title": "ZAHID BHAI (PEARL SCAFFOLD)",
              "editable": "1"
          },
          {
              "title": "MUHAMMAD HASSAN MOOSA",
              "editable": "1"
          },
          {
              "title": "SUMAIR FAREED",
              "editable": "1"
          },
          {
              "title": "Saeed Ullah Khan",
              "editable": "1"
          },
          {
              "title": "Waqas Zia",
              "editable": "1"
          },
          {
              "title": "Asif Shaikh",
              "editable": "1"
          },
          {
              "title": "Faraz Shair",
              "editable": "1"
          },
          {
              "title": "Farhan Ali",
              "editable": "1"
          },
          {
              "title": "Talha Khan",
              "editable": "1"
          },
          {
              "title": "ZAHID (FEILD)",
              "editable": "1"
          },
          {
              "title": "Shahid (Watch Man)",
              "editable": "1"
          },
          {
              "title": "Raza Ahmed",
              "editable": "1"
          },
          {
              "title": "Imran Khemani",
              "editable": "1"
          },
          {
              "title": "HAFEEZ (RIEDER)",
              "editable": "1"
          },
          {
              "title": "FARHAN (ACS)",
              "editable": "1"
          },
          {
              "title": "SHEIKH TANVEER KAMAL",
              "editable": "1"
          },
          {
              "title": "SYED IQBAL AHMED",
              "editable": "1"
          },
          {
              "title": "MUHAMMAD ASIF (IMPORT)",
              "editable": "1"
          }
      ]
  },
  {
      "title": "EXECUTIVE STAFF",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": []
  },
  {
      "title": "SHAFI ULLAH SHAH",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": []
  },
  {
      "title": "SHAHZAIB TAHHIR CLOSED",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": []
  },
  {
      "title": "SCB USD A/C",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": []
  },
  {
      "title": "I.O.U",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": [
          {
              "title": "MR.NADEEM AIRPORT",
              "editable": "1"
          },
          {
              "title": "TAIMOOR AIRPORT",
              "editable": "1"
          }
      ]
  },
  {
      "title": "OTHER RECEIVABLES",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": [
          {
              "title": "RECEIVABLE FROM CARGO LINKER",
              "editable": "1"
          },
          {
              "title": "NAIZMAH ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "RENT (AMBER TOWER)",
              "editable": "1"
          },
          {
              "title": "Air Cargo Services (ACS)",
              "editable": "1"
          },
          {
              "title": "Sea Net Shipping & Logistics (SNSL)",
              "editable": "1"
          },
          {
              "title": "SALEEM QAZI (CNEE SALMIS FURNISHER)",
              "editable": "1"
          },
          {
              "title": "GARATEX IND",
              "editable": "1"
          },
          {
              "title": "FREIGHT SAVERS SHIPPING CO.LTD",
              "editable": "1"
          }
      ]
  },
  {
      "title": "INTERNATIONALFREIGHT AVIATION",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 3,
      "childs": [
          {
              "title": "LONG TERM LIABILITIES",
              "editable": "1"
          },
          {
              "title": "LAHORE OFFICE C/A",
              "editable": "1"
          },
          {
              "title": "ACCRUED RECEIVABLE & PAYABLE",
              "editable": "1"
          },
          {
              "title": "QAMAR ALAM",
              "editable": "1"
          },
          {
              "title": "PEGASUS AIRLINE",
              "editable": "1"
          },
          {
              "title": "TURKISH AIR",
              "editable": "1"
          }
      ]
  },
  {
      "title": "CURRENT LIABILITIES",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 4,
      "childs": [
          {
              "title": "PAYABLES IMPORT",
              "editable": "1"
          },
          {
              "title": "LEAVE DEDUCTIONS",
              "editable": "1"
          },
          {
              "title": "PAYABLES CLEARING",
              "editable": "1"
          },
          {
              "title": "SEANET SHIPPING L.L.C DXB",
              "editable": "1"
          },
          {
              "title": "Mr Hamid Payable",
              "editable": "1"
          },
          {
              "title": "Prepaid Premium",
              "editable": "1"
          },
          {
              "title": "Telenor Bill Payable",
              "editable": "1"
          },
          {
              "title": "ACS Payable",
              "editable": "1"
          },
          {
              "title": "MOBILE BILL PAYABLE",
              "editable": "1"
          },
          {
              "title": "SESSI & EOBI PAYABLE",
              "editable": "1"
          },
          {
              "title": "COMPUTERS BILL PAYABLE",
              "editable": "1"
          }
      ]
  },
  {
      "title": "FOREIGN PRINCIPALS PAYABLE",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 4,
      "childs": [
          {
              "title": "3L-LEEMARK LOGISTICS LTD",
              "editable": "1"
          },
          {
              "title": "A.I. LOGISTICS (M) SDN BHD",
              "editable": "1"
          },
          {
              "title": "ACE BANGLADESH LTD",
              "editable": "1"
          },
          {
              "title": "ALLPOINTS UNLIMITED, INC",
              "editable": "1"
          },
          {
              "title": "AMARINE SHIPPING",
              "editable": "1"
          },
          {
              "title": "BORUSAN LOJISTIK",
              "editable": "1"
          },
          {
              "title": "CANWORLD LOGISTICS INC.,",
              "editable": "1"
          },
          {
              "title": "CARGO LINKERS",
              "editable": "1"
          },
          {
              "title": "CCL LOGISTICS LTD,",
              "editable": "1"
          },
          {
              "title": "CHINA GLOBAL LINES LIMITED",
              "editable": "1"
          },
          {
              "title": "CIMC GOLD WIDE TECHNOLOGY LOGISTICS GROUP CO.,LIMI",
              "editable": "1"
          },
          {
              "title": "CMA CS REFUND",
              "editable": "1"
          },
          {
              "title": "COLE INTERNATIONAL INC.",
              "editable": "1"
          },
          {
              "title": "COMPASS SEA & AIR CARGO LLC",
              "editable": "1"
          },
          {
              "title": "CONTAINER FREIGHT STATION",
              "editable": "1"
          },
          {
              "title": "EDGE WORLDWIDE LOGISTICS LIMITED",
              "editable": "1"
          },
          {
              "title": "ELS PAKISTAN",
              "editable": "1"
          },
          {
              "title": "EUR SERVICES (BD) LTD",
              "editable": "1"
          },
          {
              "title": "EVERTRANS LOGISTICS CO., LTD.",
              "editable": "1"
          },
          {
              "title": "EXIM CARGO URUGUAY",
              "editable": "1"
          },
          {
              "title": "FMG SHIPPING AND FORWARDING LTD.",
              "editable": "1"
          },
          {
              "title": "FREIGHT MANAGEMENT LIMITED",
              "editable": "1"
          },
          {
              "title": "FREIGHT OPTIONS LIMITED",
              "editable": "1"
          },
          {
              "title": "GONDRAND ANTWERPEN",
              "editable": "1"
          },
          {
              "title": "HEAD SUL LOGISTICS",
              "editable": "1"
          },
          {
              "title": "HERMES GERMANY GMBH",
              "editable": "1"
          },
          {
              "title": "KARL HEINZ DIETRICH PRAHA S.R.O.",
              "editable": "1"
          },
          {
              "title": "LAM GLOBAL TASIMACILIK COZUMLERI AS",
              "editable": "1"
          },
          {
              "title": "MAURICE WARD GROUP",
              "editable": "1"
          },
          {
              "title": "MERCATOR CARGO SYSTEMS LTD",
              "editable": "1"
          },
          {
              "title": "NETLOG GLOBAL FORWARDING A.S",
              "editable": "1"
          },
          {
              "title": "NNR GLOBAL LOGISTICS UK LIMITED",
              "editable": "1"
          },
          {
              "title": "NOATUM LOGISTICS USA LLC",
              "editable": "1"
          },
          {
              "title": "NTZ TRANSPORT LIMITED",
              "editable": "1"
          },
          {
              "title": "PANDA AIR EXPRESS CO.,LTD.",
              "editable": "1"
          },
          {
              "title": "PANDA LOGISTICS CO., LTD",
              "editable": "1"
          },
          {
              "title": "PARISI GRAND SMOOTH LOGISTICS LTD",
              "editable": "1"
          },
          {
              "title": "SCAN GLOBAL LOGISTICS",
              "editable": "1"
          },
          {
              "title": "SHANGHAI AOWEI INT'L LOGISTICS CO.,LTD.",
              "editable": "1"
          },
          {
              "title": "SHENZHEN GOLD WIDE IMP AND EXP CO LTD",
              "editable": "1"
          },
          {
              "title": "SKY LOGISTICS (BD) LTD.",
              "editable": "1"
          },
          {
              "title": "SPEEDMARK TRANSPORTATION, INC / LAX",
              "editable": "1"
          },
          {
              "title": "TAIWAN EXPRESS CO., LTD",
              "editable": "1"
          },
          {
              "title": "TEU S.A SHIPPING & FORWARDING .CO",
              "editable": "1"
          },
          {
              "title": "TRAMAR ATI",
              "editable": "1"
          },
          {
              "title": "TRANSMODAL LOGISTICS INT'L (USA)",
              "editable": "1"
          },
          {
              "title": "TRANSWING LOGISTICS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "UNISERVE LTD LONDON MEGA TERMINAL",
              "editable": "1"
          },
          {
              "title": "UNITED CARGO MANAGEMENT, INC.",
              "editable": "1"
          },
          {
              "title": "ACA INTERNATIONAL (HONG KONG) LIMITED",
              "editable": "1"
          },
          {
              "title": "ACE  FREIGHT LIMITED",
              "editable": "1"
          },
          {
              "title": "AF EXPORTS",
              "editable": "1"
          },
          {
              "title": "ALBA WHEELS UP INTERNATIONAL INC",
              "editable": "1"
          },
          {
              "title": "ALL POINTS UNLIMITED INC",
              "editable": "1"
          },
          {
              "title": "ALL-WAYS LOGISTICS (NORTH) PVT LTD",
              "editable": "1"
          },
          {
              "title": "ALPHA FORWARDING COMPANY LIMITED KOREA",
              "editable": "1"
          },
          {
              "title": "APT SHWOFREIGHT (THAILAND) LTD",
              "editable": "1"
          },
          {
              "title": "ASCO INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "ATEE APPAREL",
              "editable": "1"
          },
          {
              "title": "BILAL GARMENTS IND. (LOCAL)",
              "editable": "1"
          },
          {
              "title": "CARGO JOBS",
              "editable": "1"
          },
          {
              "title": "CARGO S.A",
              "editable": "1"
          },
          {
              "title": "CERTIFIED TRANSPORTATION GROUP INC",
              "editable": "1"
          },
          {
              "title": "CGL FLYING FISH LOGISTICS (SHANGHAI) LTD.",
              "editable": "1"
          },
          {
              "title": "COMATRAM SFAX",
              "editable": "1"
          },
          {
              "title": "CONTROLO CARGO SERVICES",
              "editable": "1"
          },
          {
              "title": "CTT DENIZCILIK ANONIM SIRKETI",
              "editable": "1"
          },
          {
              "title": "DENIM CRAFTS",
              "editable": "1"
          },
          {
              "title": "DYNAMIC SHIPPING AGENCIES",
              "editable": "1"
          },
          {
              "title": "ENVIO GLOBAL LOGISTICS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "EPSP ROISSY CDG",
              "editable": "1"
          },
          {
              "title": "EXPOLANKA",
              "editable": "1"
          },
          {
              "title": "FM GLOBAL LOGISTICS (KUL) SDN BHD",
              "editable": "1"
          },
          {
              "title": "FREIGHTERS LLC",
              "editable": "1"
          },
          {
              "title": "GAM SUPPLY CHAIN",
              "editable": "1"
          },
          {
              "title": "GBS (FREIGHT SERVICES)",
              "editable": "1"
          },
          {
              "title": "GEMS FREIGHT FORWARDING CO., LTD.",
              "editable": "1"
          },
          {
              "title": "GEX LOGISTICS - SRI LANKA",
              "editable": "1"
          },
          {
              "title": "GLOBAL AGENCIES MANAGEMENT",
              "editable": "1"
          },
          {
              "title": "GOLDAIR CARGO S.A",
              "editable": "1"
          },
          {
              "title": "GREEN WORLDWIDE SHIPPING, LLC",
              "editable": "1"
          },
          {
              "title": "GREENWICH HIGHLAND",
              "editable": "1"
          },
          {
              "title": "HAKULL AIR & SEA AS",
              "editable": "1"
          },
          {
              "title": "HERMES INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "INDEPENDENT OIL TOOLS (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "ITSA SPA",
              "editable": "1"
          },
          {
              "title": "JC ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "JUBILEE APPAREL",
              "editable": "1"
          },
          {
              "title": "KAYS WORLDWIDE LOGISTICS LLC",
              "editable": "1"
          },
          {
              "title": "KERRY LOGISTICS (GERMANY) FRANKFURT",
              "editable": "1"
          },
          {
              "title": "KERRY LOGISTICS (GERMANY) GMBH",
              "editable": "1"
          },
          {
              "title": "KERRY LOGISTICS (POLAND) SP Z.O.O,",
              "editable": "1"
          },
          {
              "title": "KERRY LOGISTICS (UK) LTD",
              "editable": "1"
          },
          {
              "title": "LOGISTICS PLUS",
              "editable": "1"
          },
          {
              "title": "M.R INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "MAURICE WARD NETWORKS UK LTD",
              "editable": "1"
          },
          {
              "title": "MERCHANT SHIPPING",
              "editable": "1"
          },
          {
              "title": "METROTEX IND",
              "editable": "1"
          },
          {
              "title": "MILESTONE TEXTILES",
              "editable": "1"
          },
          {
              "title": "MULTIMODAL OPERADOR LOGISTICO",
              "editable": "1"
          },
          {
              "title": "NATCO SA INTERNATIONAL TRANSPORTS",
              "editable": "1"
          },
          {
              "title": "NAZ TEXTILE PVT LTD",
              "editable": "1"
          },
          {
              "title": "NEDLLOYD LOGISTICS INDIA PVT. LTD.",
              "editable": "1"
          },
          {
              "title": "NIAZ GARMENTS",
              "editable": "1"
          },
          {
              "title": "NTA SP. Z.O.O",
              "editable": "1"
          },
          {
              "title": "NTZ TRANSPORT LTD.",
              "editable": "1"
          },
          {
              "title": "OFF PRICE IMPORT INC.",
              "editable": "1"
          },
          {
              "title": "ONE PLUS LOGISTICS GMBH & CO.KG",
              "editable": "1"
          },
          {
              "title": "OPULENT INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "ORIONCO SHIPPING B.V.",
              "editable": "1"
          },
          {
              "title": "PAKLINK SHIPPING",
              "editable": "1"
          },
          {
              "title": "PELLE CLASSIC",
              "editable": "1"
          },
          {
              "title": "PETER RATHMANN & CO. GMBH",
              "editable": "1"
          },
          {
              "title": "POPULAR FABRICS LTD",
              "editable": "1"
          },
          {
              "title": "PRO-MARINE EXPRESS CO.,LTD",
              "editable": "1"
          },
          {
              "title": "PT TAJ LOGISTIK INDONESIA",
              "editable": "1"
          },
          {
              "title": "PT. TIGA  BINTANG  JAYA",
              "editable": "1"
          },
          {
              "title": "SAFA INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "SALOTA INTERNATIONAL (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "SCANWELL LOGITICS SPAIN SL",
              "editable": "1"
          },
          {
              "title": "SEA NET TRADING",
              "editable": "1"
          },
          {
              "title": "SEA TRADE SERVICES (PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "SEKO GLOBAL LOGISTICS JAPAN CO. LTD",
              "editable": "1"
          },
          {
              "title": "SEKO INT'L FREIGHT FORWARDING (SHANGHAI)",
              "editable": "1"
          },
          {
              "title": "SEKO LOGISTICS (CAPE TOWN) S.A",
              "editable": "1"
          },
          {
              "title": "SEKO LOGISTICS (FELIXSTOWE)",
              "editable": "1"
          },
          {
              "title": "SEKO LOGISTICS (LONDON) LIMITED",
              "editable": "1"
          },
          {
              "title": "SEKO LOGISTICS (NY)",
              "editable": "1"
          },
          {
              "title": "SEKO LOGISTICS - ATLANTA",
              "editable": "1"
          },
          {
              "title": "SEKO LOGISTICS - MIAMI",
              "editable": "1"
          },
          {
              "title": "SEKO LOGISTICS - NORWAY",
              "editable": "1"
          },
          {
              "title": "SEKO LOGISTICS LOS ANGELES",
              "editable": "1"
          },
          {
              "title": "SEKO LOGISTICS SOUTHAMPTON LTD",
              "editable": "1"
          },
          {
              "title": "SEKO OMNI-CHANNEL LOGISTICS - NZ",
              "editable": "1"
          },
          {
              "title": "SEKO WORLDWIDE - SAN DIEGO",
              "editable": "1"
          },
          {
              "title": "SEKO WORLDWIDE LLC - BALTIMORE",
              "editable": "1"
          },
          {
              "title": "SEKO WORLDWIDE LLC - CHICAGO",
              "editable": "1"
          },
          {
              "title": "SEKO WORLDWIDE LLC - ORLANDO",
              "editable": "1"
          },
          {
              "title": "SERVOTECH SHIPPING (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "SES INDUSTRIES",
              "editable": "1"
          },
          {
              "title": "SHANGAI SENTING INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "SHANGHAI SUNBOOM INT'L TRANSPORTATION",
              "editable": "1"
          },
          {
              "title": "SHANGHAI WIZWAY INTERNATIONAL LOGISTICS",
              "editable": "1"
          },
          {
              "title": "SIKKAS KWICK HANDLING SERVICES PVT LID",
              "editable": "1"
          },
          {
              "title": "SKYWAYS AIR SERVICES (P) LTD.",
              "editable": "1"
          },
          {
              "title": "SKYWAYS SLS CARGO SERVICES LLC",
              "editable": "1"
          },
          {
              "title": "SPEDYCARGO SA",
              "editable": "1"
          },
          {
              "title": "SPEEDMARK TRANSPORTATION, INC / ATL",
              "editable": "1"
          },
          {
              "title": "STS LOGISTICS BENELUX BV",
              "editable": "1"
          },
          {
              "title": "TAIWAN EXPRESS CO., LTD.",
              "editable": "1"
          },
          {
              "title": "TRANS AIR SERVICES",
              "editable": "1"
          },
          {
              "title": "TRANS GLOBAL (PTE )LTD",
              "editable": "1"
          },
          {
              "title": "UNIBIS LTD.",
              "editable": "1"
          },
          {
              "title": "UNIPAC SHIPPING INC",
              "editable": "1"
          },
          {
              "title": "VISA GLOBAL LOGISTICS",
              "editable": "1"
          },
          {
              "title": "WATERLINK PAKISTAN",
              "editable": "1"
          },
          {
              "title": "WATSON GLOBAL LOGISTICS BVBA",
              "editable": "1"
          },
          {
              "title": "ZIYA FREIGHT",
              "editable": "1"
          },
          {
              "title": "GLS INTERNETIONAL",
              "editable": "1"
          },
          {
              "title": "SONIC TEXTILE INDUSTRIES-AGENT",
              "editable": "1"
          },
          {
              "title": "FACILITIES SHIPPING AGENCY-AGENT",
              "editable": "1"
          },
          {
              "title": "MARVA EXPORTS.",
              "editable": "1"
          },
          {
              "title": "SHIP-LOG A/S",
              "editable": "1"
          },
          {
              "title": "SKYWAYS SLS LOGISTIK GMBH",
              "editable": "1"
          },
          {
              "title": "GENEL TRANSPORT",
              "editable": "1"
          }
      ]
  },
  {
      "title": "Legerhauser Aarau",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 4,
      "childs": []
  },
  {
      "title": "CL. AGENT PAYABLE",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 4,
      "childs": [
          {
              "title": "CARGO CORPORATION.",
              "editable": "1"
          },
          {
              "title": "CLEAR AIDS",
              "editable": "1"
          },
          {
              "title": "F. K. ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "H. A & SONS",
              "editable": "1"
          },
          {
              "title": "MARFANI BROTHERS",
              "editable": "1"
          },
          {
              "title": "PAK EXPRESS",
              "editable": "1"
          },
          {
              "title": "RAAZIQ INTERNATIONAL PVT LTD",
              "editable": "1"
          },
          {
              "title": "RABI ENTERPREISES",
              "editable": "1"
          },
          {
              "title": "REGENT SERVICES",
              "editable": "1"
          },
          {
              "title": "S.M. ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "SELF",
              "editable": "1"
          },
          {
              "title": "SHARWANI TRADERS",
              "editable": "1"
          },
          {
              "title": "UNION ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "JAN CONTAINER LINES LLC",
              "editable": "1"
          },
          {
              "title": "VDH NEXT BV",
              "editable": "1"
          },
          {
              "title": "Noatum Logistics Japan Limited",
              "editable": "1"
          },
          {
              "title": "Blue Whale Shipping Services Co",
              "editable": "1"
          },
          {
              "title": "PRO AG CHB MIAMI",
              "editable": "1"
          },
          {
              "title": "SIKKAS KWICK HANDLING SERVICES PVT LTD",
              "editable": "1"
          },
          {
              "title": "SPEEDMARK Transportation (BD) Ltd",
              "editable": "1"
          },
          {
              "title": "DOUANE LOGISTICS ET SERVICES (DLS)",
              "editable": "1"
          },
          {
              "title": "SPEEDMARK TRANSPORTATION, INC.",
              "editable": "1"
          },
          {
              "title": "Arnaud Logis SA",
              "editable": "1"
          },
          {
              "title": "NEDLLOYD LOGISTICS CANADA INC.",
              "editable": "1"
          },
          {
              "title": "Fast Logistics Cargo FZCO",
              "editable": "1"
          },
          {
              "title": "PRIME TRANSPORT NY",
              "editable": "1"
          },
          {
              "title": "SPEEDMARK TRANSPORTATOIN, INC / HOU",
              "editable": "1"
          },
          {
              "title": "BEE LOGISTICS CORPORATION",
              "editable": "1"
          },
          {
              "title": "SPEEDMARK TRANSPORTATION, INC / NYK",
              "editable": "1"
          },
          {
              "title": "SKYLINE FORWARDING FIRM CO., LTD",
              "editable": "1"
          },
          {
              "title": "FOCUS LINKS CORP",
              "editable": "1"
          },
          {
              "title": "PLANEX LOGISTICS PVT LTD",
              "editable": "1"
          },
          {
              "title": "ACITO LOGISTICS GMBH",
              "editable": "1"
          },
          {
              "title": "MARE LOJISTIK HIZMETLERI TIC.A.S",
              "editable": "1"
          },
          {
              "title": "TAM LOGISTICS LLC",
              "editable": "1"
          },
          {
              "title": "GRAVITAS INTERNATIONAL LOGISTICS",
              "editable": "1"
          },
          {
              "title": "GOFORWARD APS",
              "editable": "1"
          },
          {
              "title": "LDP LOGISTICS.",
              "editable": "1"
          },
          {
              "title": "CENTRAL GLOBAL CARGO GMBH",
              "editable": "1"
          },
          {
              "title": "CM FREIGHT & SHIPPING",
              "editable": "1"
          },
          {
              "title": "EASTWAY GLOBAL FORWARDING LTD.",
              "editable": "1"
          },
          {
              "title": "FEAG INTERNATIONAL FREIGHT FORWARDERS LTD",
              "editable": "1"
          },
          {
              "title": "SUREFREIGHT INTERNATIONAL LIMITED",
              "editable": "1"
          },
          {
              "title": "O F S CARGO SERVICES LLC",
              "editable": "1"
          },
          {
              "title": "WORLD TRANSPORT OVERSEAS HELLAS S.A.GREECE",
              "editable": "1"
          },
          {
              "title": "BLU LOGISTICS COLOMBIA SAS",
              "editable": "1"
          },
          {
              "title": "TRADE EXPEDITORS USA / TEU GLOBAL",
              "editable": "1"
          },
          {
              "title": "TRANSMODAL CORPORATION",
              "editable": "1"
          },
          {
              "title": "MAURICE WARD LOGISTICS GMBH",
              "editable": "1"
          },
          {
              "title": "CARGOWAYS OCEAN SERVICES INC",
              "editable": "1"
          },
          {
              "title": "TRANZACTION TRADE FACILITATION",
              "editable": "1"
          },
          {
              "title": "EXPRESS FREIGHT",
              "editable": "1"
          },
          {
              "title": "HUSSAIN SONS",
              "editable": "1"
          },
          {
              "title": "IFK ENTERPRICES",
              "editable": "1"
          },
          {
              "title": "S.A. REHMAT",
              "editable": "1"
          },
          {
              "title": "TRADE LINKER.",
              "editable": "1"
          }
      ]
  },
  {
      "title": "LOAN FROM DIRECTORS",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 4,
      "childs": []
  },
  {
      "title": "OTHER PAYABLE",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 4,
      "childs": [
          {
              "title": "SALARY PAYABLE (ACS)",
              "editable": "1"
          },
          {
              "title": "ELECTRICITY PAYABLE",
              "editable": "1"
          },
          {
              "title": "TELEPHONE BILL PAYABLE  (SNSL)",
              "editable": "1"
          },
          {
              "title": "INT'L DAILING PHONE A/C",
              "editable": "1"
          },
          {
              "title": "ACCRUED HANDLING +SCANNING EXP.",
              "editable": "1"
          },
          {
              "title": "ACCRUED TRANSPORT A/C",
              "editable": "1"
          },
          {
              "title": "ACCRUED CIVIL AVIATION",
              "editable": "1"
          },
          {
              "title": "WASIQ SHAB PAYABLE",
              "editable": "1"
          },
          {
              "title": "TELEPHONE BILL PAYABLE (ACS)",
              "editable": "1"
          },
          {
              "title": "SALARY PAYABLE (SNSL)",
              "editable": "1"
          },
          {
              "title": "UFONE BILL PAYABLE",
              "editable": "1"
          },
          {
              "title": "ACCAP PAYABLE",
              "editable": "1"
          },
          {
              "title": "IATA CASS ADJUSTMENT PAYABLE",
              "editable": "1"
          },
          {
              "title": "INTEREST PAYABLE",
              "editable": "1"
          },
          {
              "title": "ANNUAL FEE PAYABLE",
              "editable": "1"
          },
          {
              "title": "PROVISION FOR BED DEBTS",
              "editable": "1"
          },
          {
              "title": "GAS BILLS",
              "editable": "1"
          },
          {
              "title": "WATER BILL PAYABLE",
              "editable": "1"
          },
          {
              "title": "STAFF LUNCH PAYABLE",
              "editable": "1"
          },
          {
              "title": "ACCRUED AIR PORT EXPENSES",
              "editable": "1"
          },
          {
              "title": "cash received",
              "editable": "1"
          },
          {
              "title": "DRAWING BABAR SB",
              "editable": "1"
          },
          {
              "title": "D/O CHARGES PAYABLE",
              "editable": "1"
          },
          {
              "title": "INTERNET BILL PAYABLE",
              "editable": "1"
          },
          {
              "title": "ADVANCE A/C",
              "editable": "1"
          },
          {
              "title": "ACCRUED DOC.EXP",
              "editable": "1"
          },
          {
              "title": "ACCRUED CONVAYNCE  EXPENSES",
              "editable": "1"
          },
          {
              "title": "ACCRUED DISPATCH EXPENSES",
              "editable": "1"
          },
          {
              "title": "ACCRUED REFUND A/C",
              "editable": "1"
          },
          {
              "title": "FREIGHT CHARGES",
              "editable": "1"
          },
          {
              "title": "ACCRUED FUEL EXP",
              "editable": "1"
          },
          {
              "title": "ACCRUED MAINTENANCE EXPENSES",
              "editable": "1"
          },
          {
              "title": "ACCRUED UTILITIES EXPENSES",
              "editable": "1"
          },
          {
              "title": "ACCRUED SALES TAX",
              "editable": "1"
          },
          {
              "title": "CONTAINER CHARGES",
              "editable": "1"
          },
          {
              "title": "PETTY CASH DEPOSIT",
              "editable": "1"
          },
          {
              "title": "ICM ( NEW )",
              "editable": "1"
          },
          {
              "title": "GLS INT'L",
              "editable": "1"
          },
          {
              "title": "ARSLANI CLEARING",
              "editable": "1"
          }
      ]
  },
  {
      "title": "VEY - FLUID TECHNOLOGY INT.",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 4,
      "childs": []
  },
  {
      "title": "MMS - SECURITIES",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 4,
      "childs": []
  },
  {
      "title": "LOTUS FOODS",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 4,
      "childs": []
  },
  {
      "title": "INT'L DAILING PHONE EXP.",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 4,
      "childs": []
  },
  {
      "title": "ACCOUNT PAYABLE",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 4,
      "childs": [
          {
              "title": "QASIM INTERNATIONAL FREIGHT",
              "editable": "1"
          },
          {
              "title": "QICT WHARFAGE",
              "editable": "1"
          },
          {
              "title": "PICT WHARFAGE",
              "editable": "1"
          },
          {
              "title": "BAY WEST PVT LTD",
              "editable": "1"
          },
          {
              "title": "ETIHAD AIR CARGO",
              "editable": "1"
          },
          {
              "title": "DYNAMIC SHIPPING AGNECIES PVT LTD",
              "editable": "1"
          },
          {
              "title": "COPA AIR",
              "editable": "1"
          },
          {
              "title": "ADVANCE KICT",
              "editable": "1"
          },
          {
              "title": "SEA NET TRANSPORT",
              "editable": "1"
          },
          {
              "title": "AL-AWAN TRANSPORT",
              "editable": "1"
          },
          {
              "title": "INTERASIA LINE SINGAPORE.",
              "editable": "1"
          },
          {
              "title": "WEBOC TOKEN",
              "editable": "1"
          },
          {
              "title": "ARSLANI CLEARING A",
              "editable": "1"
          },
          {
              "title": "CARGO LINKERS.",
              "editable": "1"
          },
          {
              "title": "Acumen Freight Solutions",
              "editable": "1"
          },
          {
              "title": "MUHAMMAD BILAL",
              "editable": "1"
          },
          {
              "title": "MERCHANT SHIPPING (PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "SEA HAWK SHIPPING",
              "editable": "1"
          },
          {
              "title": "TransNet Shipping (Pvt) Ltd.",
              "editable": "1"
          },
          {
              "title": "FACILITIES",
              "editable": "1"
          },
          {
              "title": "GLS INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "Syed Muhammad Ali Jillani",
              "editable": "1"
          },
          {
              "title": "MAK LOGISTICS",
              "editable": "1"
          },
          {
              "title": "ORION SHIPPING AGENCY",
              "editable": "1"
          },
          {
              "title": "OOCL LOG (ZIA)",
              "editable": "1"
          },
          {
              "title": "FAST LOGISTICS",
              "editable": "1"
          },
          {
              "title": "NLC MARINE & AIR SERVICES",
              "editable": "1"
          },
          {
              "title": "CAA NOC",
              "editable": "1"
          },
          {
              "title": "NEXT AVIATION SYSTEMS",
              "editable": "1"
          },
          {
              "title": "MAFHH AVIATION",
              "editable": "1"
          },
          {
              "title": "GREEN BOX PVT LTD",
              "editable": "1"
          },
          {
              "title": "Jawed All Steady Enterprises",
              "editable": "1"
          },
          {
              "title": "CLIPPERS FREIGHT SERVICES.",
              "editable": "1"
          },
          {
              "title": "LOGISTICA",
              "editable": "1"
          },
          {
              "title": "ALTRON SHIPPING PTE LTD",
              "editable": "1"
          },
          {
              "title": "ABID @ YAASEEN SHIPPING LINES",
              "editable": "1"
          },
          {
              "title": "CENTRAL CARGO S.R.L.",
              "editable": "1"
          },
          {
              "title": "H & FRIENDS GTL (MALAYSIA) SDN BHD.",
              "editable": "1"
          },
          {
              "title": "FREIGHT SHIPPING AND LOGISTICS GLOBAL (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "VIRGIN ATLANTIC CARGO",
              "editable": "1"
          },
          {
              "title": "INTERNATIONAL FREIGHT AVIATION",
              "editable": "1"
          },
          {
              "title": "MURTAZA-PIA",
              "editable": "1"
          },
          {
              "title": "SEAFREIGHT ADVISOR",
              "editable": "1"
          },
          {
              "title": "SAUDI ARABIAN AIRLINE",
              "editable": "1"
          },
          {
              "title": "ZAHID-(DO)",
              "editable": "1"
          },
          {
              "title": "FLYNAS",
              "editable": "1"
          },
          {
              "title": "FLY NAS",
              "editable": "1"
          },
          {
              "title": "ACUMEN FREIGHT SYSTEM",
              "editable": "1"
          },
          {
              "title": "AIR ARABIA",
              "editable": "1"
          },
          {
              "title": "AIR CHINA",
              "editable": "1"
          },
          {
              "title": "ALLIED LOGISTICS PVT LTD",
              "editable": "1"
          },
          {
              "title": "ANCHORAGE SHIPPING LINE",
              "editable": "1"
          },
          {
              "title": "BRITISH AIRWAYS",
              "editable": "1"
          },
          {
              "title": "CMA CGM PAKISTAN (PVT.) LTD",
              "editable": "1"
          },
          {
              "title": "COMBINED FREIGHT INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "COSCO-SAEED KARACHI (PVT.) LTD",
              "editable": "1"
          },
          {
              "title": "COURIER - MR. INTERSAR",
              "editable": "1"
          },
          {
              "title": "CP WORLD.",
              "editable": "1"
          },
          {
              "title": "DHL AIRWAYS",
              "editable": "1"
          },
          {
              "title": "DIAMOND SHIPPING SERVICES (PVT.) LT",
              "editable": "1"
          },
          {
              "title": "DYNAMIC SHIPPING AGENCIES (PVT",
              "editable": "1"
          },
          {
              "title": "ECU LINE PAKISTAN (PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "EITHAD AIRWAYS",
              "editable": "1"
          },
          {
              "title": "EMIRATES AIRLINES",
              "editable": "1"
          },
          {
              "title": "EMIRATES SHIPPING LINE DMCEST",
              "editable": "1"
          },
          {
              "title": "ETHIOPIAN AIRLINES",
              "editable": "1"
          },
          {
              "title": "ETIHAD AIRLINE",
              "editable": "1"
          },
          {
              "title": "FACILITIES SHIPPING AGENCY",
              "editable": "1"
          },
          {
              "title": "FITS AIR",
              "editable": "1"
          },
          {
              "title": "Fly-dubai",
              "editable": "1"
          },
          {
              "title": "GAM Supply Chain (Pvt) Ltd",
              "editable": "1"
          },
          {
              "title": "GLOBAL CONSOLIDATOR PAKISTAN PVT LTD",
              "editable": "1"
          },
          {
              "title": "GREENPAK SHIPPING (PVT.) LTD.",
              "editable": "1"
          },
          {
              "title": "GULF AIR",
              "editable": "1"
          },
          {
              "title": "HAPAG-LLOYD CONTAINER LINE",
              "editable": "1"
          },
          {
              "title": "IDEA LOGISTICS",
              "editable": "1"
          },
          {
              "title": "INTER-FREIGHT CONSOLIDATORS",
              "editable": "1"
          },
          {
              "title": "LAUREL NAVIGATION LIMITED",
              "editable": "1"
          },
          {
              "title": "MAERSK LINE",
              "editable": "1"
          },
          {
              "title": "MSC PAKISTAN (PVT.) LTD.",
              "editable": "1"
          },
          {
              "title": "NEWS LOGISTICS",
              "editable": "1"
          },
          {
              "title": "OMAN AIR",
              "editable": "1"
          },
          {
              "title": "ONE LINE",
              "editable": "1"
          },
          {
              "title": "OOCL PAKISTAN (PVT.) LTD.",
              "editable": "1"
          },
          {
              "title": "PEGASUS AIR LINE",
              "editable": "1"
          },
          {
              "title": "QATAR AIR WAYS",
              "editable": "1"
          },
          {
              "title": "Ranks Logistics Pakistan (Pvt) Ltd",
              "editable": "1"
          },
          {
              "title": "SAUDI ARABIAN AIRLINES",
              "editable": "1"
          },
          {
              "title": "SEA HAWK SHIPPING LINE",
              "editable": "1"
          },
          {
              "title": "SEA SHORE LOGISTICS.",
              "editable": "1"
          },
          {
              "title": "SHARAF SHIPPING AGENCY (PVT.)",
              "editable": "1"
          },
          {
              "title": "SHIPCO TRANSPORT PAKISTAN",
              "editable": "1"
          },
          {
              "title": "SRILANKA AIRLINES",
              "editable": "1"
          },
          {
              "title": "Silk Way Airlines",
              "editable": "1"
          },
          {
              "title": "THAI AIRWAYS",
              "editable": "1"
          },
          {
              "title": "TURKISH AIRWAYS",
              "editable": "1"
          },
          {
              "title": "UNITED ARAB SHIPPING AGENCY COMPANY",
              "editable": "1"
          },
          {
              "title": "UNITED MARINE AGENCIES (PVT) L",
              "editable": "1"
          },
          {
              "title": "UNITED MARINE AGENCIES PVT LTD",
              "editable": "1"
          },
          {
              "title": "UNIVERSAL SHIPPING (PVT.) LTD",
              "editable": "1"
          },
          {
              "title": "UPS",
              "editable": "1"
          },
          {
              "title": "WATERLINK PAKISTAN PVT LTD",
              "editable": "1"
          },
          {
              "title": "YANG MING LINE",
              "editable": "1"
          },
          {
              "title": "YTO CARGO AIRLINES CO.,LTD",
              "editable": "1"
          },
          {
              "title": "QATAR AIRWAYS",
              "editable": "1"
          },
          {
              "title": "ACE Airline",
              "editable": "1"
          },
          {
              "title": "ACTIVE FREIGHT SERVICES (PVT) LTD.",
              "editable": "1"
          },
          {
              "title": "ACUMEN FREIGHT SOLUTIONS BUSINES",
              "editable": "1"
          },
          {
              "title": "ADAM SHIPPING (PVT) LIMITED",
              "editable": "1"
          },
          {
              "title": "AERO EXPRESS INT'L",
              "editable": "1"
          },
          {
              "title": "AIR ASTANA",
              "editable": "1"
          },
          {
              "title": "AIR BERLIN",
              "editable": "1"
          },
          {
              "title": "AIR BLUE",
              "editable": "1"
          },
          {
              "title": "AIR CANADA",
              "editable": "1"
          },
          {
              "title": "AIR EUROPA CARGO",
              "editable": "1"
          },
          {
              "title": "AJ WORLD WIDE SERVICES PAKISTAN PVT",
              "editable": "1"
          },
          {
              "title": "AL JAZEERA",
              "editable": "1"
          },
          {
              "title": "ALLIED LOGISTIC (SMC-PVT.) LTD",
              "editable": "1"
          },
          {
              "title": "AMERICAN AIRLINES",
              "editable": "1"
          },
          {
              "title": "APL LOGISTICS",
              "editable": "1"
          },
          {
              "title": "APL PAKISTAN (PVT.) LTD",
              "editable": "1"
          },
          {
              "title": "AZTEC AIRWAYS",
              "editable": "1"
          },
          {
              "title": "Aas Moving Sergvices",
              "editable": "1"
          },
          {
              "title": "Air Serbia",
              "editable": "1"
          },
          {
              "title": "CAPITAL SHIPPING AGENCY",
              "editable": "1"
          },
          {
              "title": "CARGO CARE",
              "editable": "1"
          },
          {
              "title": "CARGO LUX",
              "editable": "1"
          },
          {
              "title": "CARGO SHIPPING & LOGISTICS",
              "editable": "1"
          },
          {
              "title": "CATHAY PACIFIC",
              "editable": "1"
          },
          {
              "title": "CHAM WINGS AIRLINES",
              "editable": "1"
          },
          {
              "title": "CHINA CONTAINER LINE",
              "editable": "1"
          },
          {
              "title": "CHINA SOUTHERN",
              "editable": "1"
          },
          {
              "title": "CIM SHIPPING",
              "editable": "1"
          },
          {
              "title": "CLEAR FREIGHT INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "CONCORD LOGISTICS INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "CSS LINE",
              "editable": "1"
          },
          {
              "title": "CSS PAKISTAN PVT LTD",
              "editable": "1"
          },
          {
              "title": "DELTA TRANSPORT PVT. LTD.",
              "editable": "1"
          },
          {
              "title": "DHL EXPRESS",
              "editable": "1"
          },
          {
              "title": "DOLPHIN AIR",
              "editable": "1"
          },
          {
              "title": "DYNAMIC SHIPPING AGENCIES PVT. LTD.",
              "editable": "1"
          },
          {
              "title": "Delta Cargo",
              "editable": "1"
          },
          {
              "title": "E2E SUPPLY CHAIN MANAGEMENT (PVT.)",
              "editable": "1"
          },
          {
              "title": "ERITREAN AIRLINES",
              "editable": "1"
          },
          {
              "title": "FEDEX",
              "editable": "1"
          },
          {
              "title": "GLOBAL FREIGHT SOLUTION",
              "editable": "1"
          },
          {
              "title": "GLOBAL FREIGHT SOLUTIONS FZE",
              "editable": "1"
          },
          {
              "title": "Globelink Pakistan (Pvt.) Ltd.",
              "editable": "1"
          },
          {
              "title": "HANJIN SHIPPING",
              "editable": "1"
          },
          {
              "title": "INFINITY SHIPPING SERVICES",
              "editable": "1"
          },
          {
              "title": "INSERVEY PAKISTAN (PVT.) LTD.",
              "editable": "1"
          },
          {
              "title": "INTERNATIONAL AIR & SEA (SALEEM)",
              "editable": "1"
          },
          {
              "title": "INTERNATIONAL FREIGHT & AVIATION",
              "editable": "1"
          },
          {
              "title": "K L M",
              "editable": "1"
          },
          {
              "title": "KL SHIPPING & LOGISTIC",
              "editable": "1"
          },
          {
              "title": "KLM CARGO",
              "editable": "1"
          },
          {
              "title": "LUFTHANSA AIR",
              "editable": "1"
          },
          {
              "title": "MAERSK LOGISTICS PAKISTAN (PVT",
              "editable": "1"
          },
          {
              "title": "MALAYSIAN AIRLINES",
              "editable": "1"
          },
          {
              "title": "MARINE SERVICES PVT. LTD.",
              "editable": "1"
          },
          {
              "title": "MEGA IMPEX",
              "editable": "1"
          },
          {
              "title": "MEHR CARGO (PVT) LTD",
              "editable": "1"
          },
          {
              "title": "Middle East Airlines",
              "editable": "1"
          },
          {
              "title": "MIDEX AIRLINES",
              "editable": "1"
          },
          {
              "title": "MITSUI O.S.K. LINES PAKISTAN",
              "editable": "1"
          },
          {
              "title": "NEW WORLD LOGISTICS",
              "editable": "1"
          },
          {
              "title": "NYK LINE PAKISTAN (PVT.) LTD",
              "editable": "1"
          },
          {
              "title": "P & S CARGO SERVICES PVT LTD",
              "editable": "1"
          },
          {
              "title": "P I A",
              "editable": "1"
          },
          {
              "title": "PACIFIC DELTA SHIPPING",
              "editable": "1"
          },
          {
              "title": "PACIFIC FREIGHT SYSTEM",
              "editable": "1"
          },
          {
              "title": "PACIFIC SHIPPING LINES",
              "editable": "1"
          },
          {
              "title": "PAKLINK SHIPPING SERVICES",
              "editable": "1"
          },
          {
              "title": "PIA INTERNATIONAL",
              "editable": "1"
          },
          {
              "title": "QUICK FREIGHT MANAGEMENT PAKISTAN",
              "editable": "1"
          },
          {
              "title": "RIAZEDA PVT. LTD.",
              "editable": "1"
          },
          {
              "title": "RWAYS CONTAINER LINE L.L.C",
              "editable": "1"
          },
          {
              "title": "SAFMARINE PAKISTAN PVT LTD",
              "editable": "1"
          },
          {
              "title": "SALAM AIR",
              "editable": "1"
          },
          {
              "title": "SAMUDERA SHIPPING LINE LTD",
              "editable": "1"
          },
          {
              "title": "SEA EXPERT SHIPPING & LOGISTICS",
              "editable": "1"
          },
          {
              "title": "SEA SQUAD LOGISTICS",
              "editable": "1"
          },
          {
              "title": "SEAGOLD (PRIVATE) LIMITED",
              "editable": "1"
          },
          {
              "title": "SEALOG PVT. LIMITED",
              "editable": "1"
          },
          {
              "title": "SEAWAYS LOGISTICS SERVICES",
              "editable": "1"
          },
          {
              "title": "SERVOTECH SHIPPING (PVT.) LTD.",
              "editable": "1"
          },
          {
              "title": "SIS LOGISTICAL SYSTEMS LTD.",
              "editable": "1"
          },
          {
              "title": "SKY NET",
              "editable": "1"
          },
          {
              "title": "SOFTWARE",
              "editable": "1"
          },
          {
              "title": "SWISS AIR",
              "editable": "1"
          },
          {
              "title": "TRADESIA SHIPPING",
              "editable": "1"
          },
          {
              "title": "United Airline",
              "editable": "1"
          },
          {
              "title": "VALUE LOGISTICS PVT LTD",
              "editable": "1"
          },
          {
              "title": "VERTEX CONTAINER LINE PVT LTD",
              "editable": "1"
          },
          {
              "title": "VISION AIR",
              "editable": "1"
          },
          {
              "title": "WORLD SHIPPING & CONSOLIDATORS",
              "editable": "1"
          },
          {
              "title": "YASEEN SHIPPING LINES",
              "editable": "1"
          }
      ]
  },
  {
      "title": "REBATE PAYABLE",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 4,
      "childs": [
          {
              "title": "Raheel @ Amanullah",
              "editable": "1"
          },
          {
              "title": "AHAD UNITEX",
              "editable": "1"
          },
          {
              "title": "ARIF (NOVA LEATHER)",
              "editable": "1"
          },
          {
              "title": "ARSHAD HAFEEZ",
              "editable": "1"
          },
          {
              "title": "CLI",
              "editable": "1"
          },
          {
              "title": "CMA CGM",
              "editable": "1"
          },
          {
              "title": "CMA-CS",
              "editable": "1"
          },
          {
              "title": "DALER",
              "editable": "1"
          },
          {
              "title": "DARYL T JOHN",
              "editable": "1"
          },
          {
              "title": "DELTA IMRAN JAMEEL",
              "editable": "1"
          },
          {
              "title": "ERRY-PIA",
              "editable": "1"
          },
          {
              "title": "FARHAN CONTINENTAL",
              "editable": "1"
          },
          {
              "title": "FAROOQ",
              "editable": "1"
          },
          {
              "title": "HAIDER BHAI",
              "editable": "1"
          },
          {
              "title": "HAMID",
              "editable": "1"
          },
          {
              "title": "HAMID (LOJISTICA)",
              "editable": "1"
          },
          {
              "title": "I.A.K",
              "editable": "1"
          },
          {
              "title": "IMRAN JAMIL (HAPAG)",
              "editable": "1"
          },
          {
              "title": "JOONAID CO - SOHAIL",
              "editable": "1"
          },
          {
              "title": "KAMRAN OMAN AIR",
              "editable": "1"
          },
          {
              "title": "LUTUF ULLAH (PIA)",
              "editable": "1"
          },
          {
              "title": "MAMUN BHAI (UASC)",
              "editable": "1"
          },
          {
              "title": "ASIF SB (MN TEXTILE)",
              "editable": "1"
          },
          {
              "title": "MOIN PIA",
              "editable": "1"
          },
          {
              "title": "NADEEM (AIR PORT)",
              "editable": "1"
          },
          {
              "title": "NADEEM - COMPAINION SERVICES",
              "editable": "1"
          },
          {
              "title": "NAEEM SHAH (BNI INKS)",
              "editable": "1"
          },
          {
              "title": "NASEER (HAFIZ TANNERY)",
              "editable": "1"
          },
          {
              "title": "NASIR  (IMRAN BROS)",
              "editable": "1"
          },
          {
              "title": "ORIENT CARGO SER.",
              "editable": "1"
          },
          {
              "title": "QASIM (ASS MOVING)",
              "editable": "1"
          },
          {
              "title": "QAZI (UNIVERSAL SHIPPING)",
              "editable": "1"
          },
          {
              "title": "RAFIQ ROOPANI (HBL)",
              "editable": "1"
          },
          {
              "title": "SALEEM SB (SMSCHEMICAL)",
              "editable": "1"
          },
          {
              "title": "SHAHID BHAI (ACS)",
              "editable": "1"
          },
          {
              "title": "SHAHZAD APP RIAZ",
              "editable": "1"
          },
          {
              "title": "SHAHZAIB UNISHIP",
              "editable": "1"
          },
          {
              "title": "STAR ONE SHIPPING",
              "editable": "1"
          },
          {
              "title": "SUNNY ENT (OLD A/C)",
              "editable": "1"
          },
          {
              "title": "TAIMOR (WIEGHT DIFF CARGES)",
              "editable": "1"
          },
          {
              "title": "TARIQ NOVA",
              "editable": "1"
          },
          {
              "title": "TARIQ PIAC",
              "editable": "1"
          },
          {
              "title": "TEX LINE BUYING HOUSE",
              "editable": "1"
          },
          {
              "title": "UNIQUE ENTERPRISES",
              "editable": "1"
          },
          {
              "title": "VAKIL @ HONEST FOOD",
              "editable": "1"
          },
          {
              "title": "WAJID NIZAM (FAIZ CARGO)",
              "editable": "1"
          },
          {
              "title": "WALI BHAI  (PIA)",
              "editable": "1"
          },
          {
              "title": "WASIM COSCO SAEED",
              "editable": "1"
          },
          {
              "title": "ZEESHAN (PELLE)",
              "editable": "1"
          },
          {
              "title": "AMIR BHAI / CARGO LINKERS",
              "editable": "1"
          },
          {
              "title": "ANIS @ EVERGREEN",
              "editable": "1"
          },
          {
              "title": "ANJUM - TAJ IND",
              "editable": "1"
          },
          {
              "title": "AQEEL AGRO HUB",
              "editable": "1"
          },
          {
              "title": "ARJUN - UNITED TOWEL",
              "editable": "1"
          },
          {
              "title": "CMA - CS",
              "editable": "1"
          },
          {
              "title": "EUR LOGISTICS",
              "editable": "1"
          },
          {
              "title": "FARHAN YML",
              "editable": "1"
          },
          {
              "title": "IRFAN TURKISH",
              "editable": "1"
          },
          {
              "title": "JAMAL UZAIR INT'L",
              "editable": "1"
          },
          {
              "title": "MAHSIM (SOUTHERN AGENCIES)",
              "editable": "1"
          },
          {
              "title": "NADEEM (SULTEX IND)",
              "editable": "1"
          },
          {
              "title": "NIAZ @ AL KARAM TOWEL IND",
              "editable": "1"
          },
          {
              "title": "NOMAN MILESTONE",
              "editable": "1"
          },
          {
              "title": "SALEEM SB (C/O.ELS)",
              "editable": "1"
          },
          {
              "title": "SALMAN ELS",
              "editable": "1"
          },
          {
              "title": "SHAHID (HUSSAIN LEATHER)",
              "editable": "1"
          },
          {
              "title": "PAID UP CAPITAL",
              "editable": "1"
          },
          {
              "title": "IFA A/C",
              "editable": "1"
          },
          {
              "title": "MR. HUMAYUN QAMAR (PROPRIETOR)",
              "editable": "1"
          },
          {
              "title": "CONTRA ACCOUNT OPENINIG",
              "editable": "1"
          }
      ]
  },
  {
      "title": "CAPITAL COMPANY",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 5,
      "childs": [
          {
              "title": "DIRECTOR CAPITAL",
              "editable": "1"
          }
      ]
  },
  {
      "title": "CAPITAL DIRECTORS",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 5,
      "childs": [
          {
              "title": "CAPITAL abc",
              "editable": "1"
          },
          {
              "title": "MR. HUMAYUN QAMAR (PARTNER)",
              "editable": "1"
          },
          {
              "title": "MR. QAMAR ALAM (PARTNER)",
              "editable": "1"
          },
          {
              "title": "MRS. ZAREEN QAMAR (PARTNER)",
              "editable": "1"
          },
          {
              "title": "MRS. HINA ADNAN KHAN (PARTNER)",
              "editable": "1"
          },
          {
              "title": "MISS. SHAJIA QAMAR (PARTNER)",
              "editable": "1"
          }
      ]
  },
  {
      "title": "PROFIT & LOSS SUMMARY",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 5,
      "childs": [
          {
              "title": "PROFIT & LOSS B/F",
              "editable": "1"
          }
      ]
  },
  {
      "title": "DIRECTORS DRAWING",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 5,
      "childs": [
          {
              "title": "MR. HOMAYOUN QAMAR ALAM",
              "editable": "1"
          },
          {
              "title": "DRAWING",
              "editable": "1"
          },
          {
              "title": "MR. QAMAR ALAM (DRAWING)",
              "editable": "1"
          },
          {
              "title": "MRS. ZAREEN QAMAR (DRAWING)",
              "editable": "1"
          },
          {
              "title": "MRS. HINA ADNAN KHAN (DRAWING)",
              "editable": "1"
          },
          {
              "title": "MISS. SHAJIA QAMAR (DRAWING)",
              "editable": "1"
          },
          {
              "title": "SEA NET TECHNOLOGIES",
              "editable": "1"
          },
          {
              "title": "INCOME FROM CLEARING",
              "editable": "1"
          },
          {
              "title": "INCOME FROM IMPORT",
              "editable": "1"
          },
          {
              "title": "EX-CHANGE RATE GAIN / LOSS",
              "editable": "1"
          },
          {
              "title": "AIR IMPORT INCOME",
              "editable": "1"
          }
      ]
  },
  {
      "title": "SELLING REVENUE",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 2,
      "childs": []
  },
  {
      "title": "FCL SELLING INCOME",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 2,
      "childs": [
          {
              "title": "FCL FREIGHT INCOME",
              "editable": "1"
          }
      ]
  },
  {
      "title": "LCL SELLING INCOME",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 2,
      "childs": [
          {
              "title": "LCL FREIGHT INCOME",
              "editable": "1"
          }
      ]
  },
  {
      "title": "OPEN TOP SELLING INCOME",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 2,
      "childs": [
          {
              "title": "OPEN TOP FREIGHT INCOME",
              "editable": "1"
          }
      ]
  },
  {
      "title": "IMPORT SELLING INCOME",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 2,
      "childs": [
          {
              "title": "IMPORT FREIGHT INCOME",
              "editable": "1"
          },
          {
              "title": "IMPORT INSURANCE",
              "editable": "1"
          }
      ]
  },
  {
      "title": "INCOME FROM IMPORT.",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 2,
      "childs": [
          {
              "title": "D/O INCOME",
              "editable": "1"
          }
      ]
  },
  {
      "title": "AIR SELLING INCOME",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 2,
      "childs": [
          {
              "title": "AIR FREIGHT INCOME",
              "editable": "1"
          },
          {
              "title": "AIR SALES DISCOUNT",
              "editable": "1"
          }
      ]
  },
  {
      "title": "OTHER REVENUE",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 2,
      "childs": [
          {
              "title": "MISC. INCOME",
              "editable": "1"
          },
          {
              "title": "REBATE INCOME",
              "editable": "1"
          },
          {
              "title": "CNTR HANDLING INCOME",
              "editable": "1"
          },
          {
              "title": "INTEREST INCOME",
              "editable": "1"
          },
          {
              "title": "K.B INCOME",
              "editable": "1"
          },
          {
              "title": "INTEREST PAID",
              "editable": "1"
          },
          {
              "title": "RENTAL INCOME",
              "editable": "1"
          }
      ]
  },
  {
      "title": "DETENTION INCOME",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 2,
      "childs": [
          {
              "title": "SCS COURIER EXP",
              "editable": "1"
          },
          {
              "title": "SALES TAX EXP (SRB)",
              "editable": "1"
          },
          {
              "title": "SOFTWARE & DEVELOPMENT EXPENSES",
              "editable": "1"
          },
          {
              "title": "COUNTERA ENTRY",
              "editable": "1"
          },
          {
              "title": "CONSTRUCTION A/C",
              "editable": "1"
          },
          {
              "title": "CIVIL AVIATION RENT",
              "editable": "1"
          },
          {
              "title": "COMMISSION EXPENSES",
              "editable": "1"
          },
          {
              "title": "SALES TAX SNSL",
              "editable": "1"
          },
          {
              "title": "REFUND EXPENSES (HAROON)",
              "editable": "1"
          },
          {
              "title": "INTEREST EXPENSES",
              "editable": "1"
          }
      ]
  },
  {
      "title": "SELLING EXPENSES",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 1,
      "childs": [
          {
              "title": "CLEARING EXPENSE",
              "editable": "1"
          },
          {
              "title": "BAD DEBTS",
              "editable": "1"
          },
          {
              "title": "REFUND TO AIRLINE & SHIPPING LINE",
              "editable": "1"
          }
      ]
  },
  {
      "title": "FCL SELLING EXP",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 1,
      "childs": [
          {
              "title": "FCL FREIGHT EXPENSE",
              "editable": "1"
          },
          {
              "title": "FCL REBATE EXPENSE",
              "editable": "1"
          },
          {
              "title": "DOCS EXPENSES",
              "editable": "1"
          }
      ]
  },
  {
      "title": "LCL SELLING EXP",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 1,
      "childs": [
          {
              "title": "LCL FREIGHT EXP",
              "editable": "1"
          },
          {
              "title": "LCL REBATE EXP.",
              "editable": "1"
          },
          {
              "title": "SHORT PAYMENT EXPESNES",
              "editable": "1"
          }
      ]
  },
  {
      "title": "OPEN TOP SELLING",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 1,
      "childs": [
          {
              "title": "OPENT TOP FREIGHT EXP",
              "editable": "1"
          },
          {
              "title": "OPENT TOP REBATE EXP",
              "editable": "1"
          }
      ]
  },
  {
      "title": "IMPORT SELLING  EXP.",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 1,
      "childs": [
          {
              "title": "IMPORT EXPENSES",
              "editable": "1"
          },
          {
              "title": "D/O CHARGES.",
              "editable": "1"
          }
      ]
  },
  {
      "title": "AIR SELLING EXPENSES",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 1,
      "childs": [
          {
              "title": "AIR FREIGHT EXPENSE",
              "editable": "1"
          },
          {
              "title": "AIR PORT EXPENSES",
              "editable": "1"
          }
      ]
  },
  {
      "title": "ADMIN. EXP",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 1,
      "childs": [
          {
              "title": "ZAKAT EXP",
              "editable": "1"
          },
          {
              "title": "Motor Vehicle Tax",
              "editable": "1"
          },
          {
              "title": "Audit Expence",
              "editable": "1"
          },
          {
              "title": "Courier Charges",
              "editable": "1"
          }
      ]
  },
  {
      "title": "OPRATING EXPENSES",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 1,
      "childs": [
          {
              "title": "ADVERTISEMENT EXP.",
              "editable": "1"
          },
          {
              "title": "B/L ADHESIVE CHARGES",
              "editable": "1"
          },
          {
              "title": "BROKERAGE & COMMISSION",
              "editable": "1"
          },
          {
              "title": "CHARITY & DONATION",
              "editable": "1"
          },
          {
              "title": "COMPUTER EXPENSES",
              "editable": "1"
          },
          {
              "title": "CONVEYANCE EXP.",
              "editable": "1"
          },
          {
              "title": "DIRECTORS REMUNIRATION",
              "editable": "1"
          },
          {
              "title": "ELECTRICITY CHARGES",
              "editable": "1"
          },
          {
              "title": "ENTERTAINMENT EXP.",
              "editable": "1"
          },
          {
              "title": "EQUIPMENT REPAIR",
              "editable": "1"
          },
          {
              "title": "FEES & TAXES",
              "editable": "1"
          },
          {
              "title": "INTERNET/ EMAIL / FAXES",
              "editable": "1"
          },
          {
              "title": "LEGAL & PROFESSIONAL",
              "editable": "1"
          },
          {
              "title": "LICENCE FEE",
              "editable": "1"
          },
          {
              "title": "MISC. EXPENSES",
              "editable": "1"
          },
          {
              "title": "MOBILE EXP.",
              "editable": "1"
          },
          {
              "title": "NEWS PAPER & PERIODICAL",
              "editable": "1"
          },
          {
              "title": "OFFICE REPAIR & MAINTENANCE",
              "editable": "1"
          },
          {
              "title": "PHOTO STAT",
              "editable": "1"
          },
          {
              "title": "POSTAGE & TELEGRAME",
              "editable": "1"
          },
          {
              "title": "PRINTING & STATIONERY",
              "editable": "1"
          },
          {
              "title": "RENT EXPENSE",
              "editable": "1"
          },
          {
              "title": "SALARIES & ALLOWANCES",
              "editable": "1"
          },
          {
              "title": "STAFF BONUS",
              "editable": "1"
          },
          {
              "title": "TELEPHONE & FAX BILL EXPENSES",
              "editable": "1"
          },
          {
              "title": "WAGES EXPENSES",
              "editable": "1"
          },
          {
              "title": "STAFF WALFARE",
              "editable": "1"
          },
          {
              "title": "GENERATOR EXPENSE",
              "editable": "1"
          },
          {
              "title": "SECURITY & SERVICES",
              "editable": "1"
          },
          {
              "title": "CLIMAX SOFTWARE EXP",
              "editable": "1"
          },
          {
              "title": "INSURANCE EXP (TOYOTA)",
              "editable": "1"
          },
          {
              "title": "INSURANCE EXPENSES",
              "editable": "1"
          },
          {
              "title": "EOBI EXPENSE",
              "editable": "1"
          },
          {
              "title": "DONATION",
              "editable": "1"
          },
          {
              "title": "INCOME TAX (SALARY)",
              "editable": "1"
          },
          {
              "title": "INCOM TAX ELECTRICITY",
              "editable": "1"
          },
          {
              "title": "GENERAL SALES TAX ELECTRICITY",
              "editable": "1"
          },
          {
              "title": "STATIONARY EXPENSE",
              "editable": "1"
          },
          {
              "title": "CONVAYNCE EXPENSES",
              "editable": "1"
          },
          {
              "title": "DISPATCH EXPESNES",
              "editable": "1"
          },
          {
              "title": "FUEL & OIL EXPESNES",
              "editable": "1"
          },
          {
              "title": "INTERNET & DSL EXPENSES",
              "editable": "1"
          },
          {
              "title": "WATER BILL EXPENSES",
              "editable": "1"
          },
          {
              "title": "WATER BILL EXPESNES",
              "editable": "1"
          },
          {
              "title": "UTILITIES EXPENSES",
              "editable": "1"
          },
          {
              "title": "INCOM TAX",
              "editable": "1"
          },
          {
              "title": "Guest House Repairing & Maintenance",
              "editable": "1"
          },
          {
              "title": "Bank Charges (Sunil)",
              "editable": "1"
          },
          {
              "title": "UNITED INSURANCE  CO",
              "editable": "1"
          },
          {
              "title": "SALARIES & ALLOWANCES (ACS)",
              "editable": "1"
          },
          {
              "title": "OFFICE DESIGNING",
              "editable": "1"
          },
          {
              "title": "PORT EXPENSES",
              "editable": "1"
          }
      ]
  },
  {
      "title": "VEHICLE REPAIR AND MAINTENANCE",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 1,
      "childs": []
  },
  {
      "title": "BANK & FINANCIAL CHARGES",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 1,
      "childs": [
          {
              "title": "BANK CHARGES",
              "editable": "1"
          },
          {
              "title": "MARKUP CHARGES",
              "editable": "1"
          },
          {
              "title": "COMMISSION ADV A/C",
              "editable": "1"
          },
          {
              "title": "ENTERTRANSFER A/C",
              "editable": "1"
          },
          {
              "title": "S.E.S.S.I",
              "editable": "1"
          },
          {
              "title": "READY LOAN A/C",
              "editable": "1"
          },
          {
              "title": "OUT DOOR FUEL EXP",
              "editable": "1"
          },
          {
              "title": "CUSTOM CLEARING CHARGES",
              "editable": "1"
          },
          {
              "title": "PANALTY CHARGES",
              "editable": "1"
          },
          {
              "title": "WATER & SAVERAGE BOARD BILL",
              "editable": "1"
          },
          {
              "title": "LABOUR CHARGES",
              "editable": "1"
          },
          {
              "title": "CAR INSTALMENT A/C",
              "editable": "1"
          },
          {
              "title": "SUI GAS BILL",
              "editable": "1"
          },
          {
              "title": "U.B.L  BANK",
              "editable": "1"
          },
          {
              "title": "PIA (Bank Charges)",
              "editable": "1"
          },
          {
              "title": "COMMISSION AGAINST BANK GUARANTEE",
              "editable": "1"
          },
          {
              "title": "CREDIT CARDS A/C",
              "editable": "1"
          },
          {
              "title": "B/L STUMPPING",
              "editable": "1"
          }
      ]
  },
  {
      "title": "GENERAL",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 1,
      "childs": []
  },
  {
      "title": "COMMISSION A/C",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 1,
      "childs": []
  },
  {
      "title": "MARKETING EXP.",
      "editable": "1",
      "CompanyId": 3,
      "AccountId": 1,
      "childs": [
          {
              "title": "VEHICLE & RUNNING EXP.",
              "editable": "1"
          },
          {
              "title": "RECOVERY EXP.",
              "editable": "1"
          },
          {
              "title": "TRAVELLING EXP.",
              "editable": "1"
          },
          {
              "title": "BAD DEBTS EXP",
              "editable": "1"
          },
          {
              "title": "COMMISSION A/C SEA SHIPMENTS",
              "editable": "1"
          },
          {
              "title": "SALES PROMOTION EXP",
              "editable": "1"
          },
          {
              "title": "SOFTWARE & DEVLOPMENT A/C",
              "editable": "1"
          },
          {
              "title": "COMMISSION A/C AIR SHIPMENTS",
              "editable": "1"
          },
          {
              "title": "COMMISSION ON RECOVERY",
              "editable": "1"
          },
          {
              "editable": "1"
          }
      ]
  }
]