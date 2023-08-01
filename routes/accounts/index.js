const db = require("../../models");
const routes = require('express').Router();
const { Accounts } = require('../../models/');
const { Op, QueryTypes } = require("sequelize");
const { Child_Account, Parent_Account } = require("../../functions/Associations/accountAssociations");

const { Client_Associations } = require('../../functions/Associations/clientAssociation');
const { Vendor_Associations, Vendors } = require('../../functions/Associations/vendorAssociations');
const { Vouchers, Voucher_Heads } = require("../../functions/Associations/voucherAssociations");
const { Clients } = require("../../functions/Associations/clientAssociation");
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
    let ChildObj = {};
    console.log(req.headers.type)
    if(req.headers.type=="Bank"){
        ChildObj = {subCategory:'Bank'}
      } else if(req.headers.type=="Cash"){
      obj = {
        CompanyId:parseInt(req.headers.companyid),
        //title:req.headers.type
      }
      ChildObj = {subCategory:'Cash'}
    } else if(req.headers.type=='Adjust') {
        ChildObj = {subCategory:'General'}
        //   obj = {
        //     [Op.and]: [
        //       { title: { [Op.ne]: "Cash" } },
        //       { title: { [Op.ne]: "Accounts Recievable" } },
        //       { title: { [Op.ne]: "Accounts Payble" } },
        //       { title: { [Op.ne]: "Bank" } }
        //     ]
        //   }
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
        ChildObj = {subCategory:'General'}
    } else if(req.headers.type=='Taxes') {
        ChildObj = {subCategory:'General'}
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
        where:ChildObj,
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

routes.post("/accountCreate", async(req, res) => {
    let obj = [
        {
            "title": "FIXED ASSETS",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 3,
            "childs": [
                {
                    "title": "FURNITURE & FIXTURE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "REFRIGERATOR & AIR CONDITIONER",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "OFFICE EQUIPMENT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "VEHICLE  ACCOUNT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "TELEPHONE & FAX MACHINE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "COMPUTER & ELECTRIC EQUIPMENT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SPLIT & WINDOW A.C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "LAND & BUILDING",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "COPY RIGHT & PATENTS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "TRADE MARK & FRANCHISES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "BANK GUARANTEE SECURITY DEPOSIT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MIRA (DAIHATSU) M:2012",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "PROPERTY PLANT & EQUIPMENT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "COMPUTER ACCESSORIES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FAX MACHINE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MOBILE PHONE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MOTOR CYCLE",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "ACCUMULATED DEPRICIATION",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 3,
            "childs": [
                {
                    "title": "ACCU. FURNITURE & FIXTURE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCU. COMPUTER & PRINTERS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCU. AIR CONDITIONERS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCU. OFFICE EQUIPMENT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCU. FAX MACHINE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCU. MOBILE PHONE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCU. MOTOR CYCLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCU. VEHICLE ACCOUNT",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "CURRENT ASSETS",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 3,
            "childs": [
                {
                    "title": "RECEIVABLE FROM COMPANIES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "STANDARD CHARTERD USD",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACS RECEIVABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "RECEIVABLES IMPORT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "WITHHOLDING TAX",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "RECEIVABLES CLEARING",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "A/C BAD DEBT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SCB USD A/C",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "I.O.U",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 3,
            "childs": [
                {
                    "title": "MR.NADEEM AIRPORT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "TAIMOOR AIRPORT",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "BANK",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 3,
            "childs": [
                {
                    "title": "CHEQUE IN HAND",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "BAH EUR LOG",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "UNITED BANK LIMITED KHI",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "HMB SNSL NEW BANK",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "ASKARI COMMERCIAL BANK",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "HABIB METRO BANK (SNSL)",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "ASKARI FOREIGN A/C",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "STANDARD CHARTERED BANK (NEW)",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "STANDARD CHARTERED USD",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "BANK AL-HABIB SNSL",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "SAMBA BANK LTD",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "ASKARI BANK LTD (BOSS)",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "BANK AL HABIB ACS",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "AL FALAH BANK ACS",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "BANK AL HABIB ACS PVT LTD",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "MEEZAN BANK (SNSL)",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "HABIB METRO BANK (ACS)",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "HABIB BANK LTD (ACS)",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "SUMMIT BANK TARIQ ROAD BRANCH",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "BANK AL HABIB IFA",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "ASKARI BANK NEW TARIQ RD BR",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "HMB ACS NEW BANK",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "BANK AL FALAH  USD  (BOSS)",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "ASKARI  (ACS)",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "SONERI BANK LIMITED (SNSL)",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "SONERI BANK LIMITED (ACS)",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "SONERI BANK LTD. I.F.A",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "BANK AL HABIB SNSL NEW",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "AL BARAKA BANK (ACS)",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "AL BARAKA BANK (SNSL)",
                    "subCategory": "Bank",
                    "editable": "1"
                },
                {
                    "title": "HABIB BANK LTD (HBL)",
                    "subCategory": "Bank",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "CASH",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 3,
            "childs": [
                {
                    "title": "PETTY CASH",
                    "subCategory": "Cash",
                    "editable": "1"
                },
                {
                    "title": "CASH IN HAND",
                    "subCategory": "Cash",
                    "editable": "1"
                },
                {
                    "title": "CASH IN DOLLARS",
                    "subCategory": "Cash",
                    "editable": "1"
                },
                {
                    "title": "CASH BOOK",
                    "subCategory": "Cash",
                    "editable": "1"
                },
                {
                    "title": "CASH RESERVE",
                    "subCategory": "Cash",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "ACCOUNT RECEIVABLE",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 3,
            "childs": []
        },
        {
            "title": "ADVANCES TO DIRECTORS",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 3,
            "childs": [
                {
                    "title": "DIRECTOR 1",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "DIRECTOR 2",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "ADVANCES & PREPAYMENTS",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 3,
            "childs": [
                {
                    "title": "SECURITY DEPOSIT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ADVANCE OFFICE RENT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MULTINATE   (INTERNET)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "LEASE DEPOSITS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "PTC",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "STANDARD SERVICE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FUEL DEPOSIT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "CONTAINER DEPOSITS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Sea Net Shipping (LLC)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "PIA Advance A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "P.I.A BID / TENDER ADVANCE A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SAUDI ARABIA AIRLINE ADVANCE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ADVACE TO INTER-FRET CONSOLIDATOR",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ADVANCE TO MEHR CARGO (PVT) LTD",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FARAZ IOU",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "ADVANCES TO STAFF",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 3,
            "childs": [
                {
                    "title": "STAFF A",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SHAFIULLAH (ACCOUNTS)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "RASHID EHSAN",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "IKRAM LOADER",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SALMAN AZIZ STAFF",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "AZHAR HUSSAIN (O/D)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "IFTIKHAR AHMED (O/D)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MUHAMMAD SAAD",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MUBASHIR HUSSAIN",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "AKHTAR A. HAQUE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ATHAR A. HAQUE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SUNIL (SUNNY ENTERPRISES)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SHAHID SIDDIQUI (ADV)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "BILAL AHMED (LHE STAFF) SNSL",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MUHAMMAD HANIF (CARGO LINKERS)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "GHAZANFER (AIRPORT)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "M. MURSALEEN IBRAHIM",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FARAH SALEEM (ADVANCE)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SHURUQ ANJUM (ADVANCE)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ZUBAIR O/D (ADVANCE)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "BABOO SWEEPER (ADVANCE)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ZAIN UL ABDIN O/D",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "M.SALMAN",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MUHAMMAD IRFAN (SEA)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ALI NAEEM",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "GHULAM HUSSAIN",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "IMRAN SB TURKISH AIRLLINES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FAISAL YAMIN",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "IRSA KAMRAN",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "OFFICE DRIVER  (ARSHAD)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SAAD ALI BUTT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "WAQAS ( AIR DEPT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MUHAMMAD ARSALAN",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "REHAN AHMED",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "NASIR DRIVER",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "NAZNEEN SYED",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FIZA SYED",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SADIA KHAN",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "RENEE MITCHEL",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SYED KHURSHEED",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "M. HAMID",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ZAFAR SB CL",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ABDUL RASHID",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ASAD ALI",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "IMRAN MUSTAFA",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SHERYAR",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "KASHIF MALIK",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FARAZ",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ABDUL GHAFFAR",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MUHAMMAD SABIR",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "IBRAHEEM",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "OWAIS RAZA",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ZEESHAN UL HAQ",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ANAS SIDDIQUI",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "EJAZ HASHMI",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MUSTAFA (Watchman)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ALI AKBER (Office Boy)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SHAREEF (Office Boy)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SHAKIL UR REHMAN",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ASIF (PEON)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "NASIR (AIRPORT)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "HAIDER (SEA DEPT)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ABDUL REHMAN",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MOHSIN BAIG (BOSS FRND)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "NOMAN (AIR DEPT)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Hafeez",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Ali Sabir Shah",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ZAHID BHAI (PEARL SCAFFOLD)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MUHAMMAD HASSAN MOOSA",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SUMAIR FAREED",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Saeed Ullah Khan",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Waqas Zia",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Asif Shaikh",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Faraz Shair",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Farhan Ali",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Talha Khan",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ZAHID (FEILD)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Shahid (Watch Man)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Raza Ahmed",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Imran Khemani",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "HAFEEZ (RIEDER)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FARHAN (ACS)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SHEIKH TANVEER KAMAL",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SYED IQBAL AHMED",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MUHAMMAD ASIF (IMPORT)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "EXECUTIVE STAFF",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SHAFI ULLAH SHAH",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SHAHZAIB TAHHIR CLOSED",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "OTHER RECEIVABLES",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 3,
            "childs": [
                {
                    "title": "RECEIVABLE FROM CARGO LINKER",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "NAIZMAH ENTERPRISES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "RENT (AMBER TOWER)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Air Cargo Services (ACS)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Sea Net Shipping & Logistics (SNSL)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SALEEM QAZI (CNEE SALMIS FURNISHER)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FREIGHT SAVERS SHIPPING CO.LTD",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "GARATEX INDEX",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INTERNATIONALFREIGHT AVIATION",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "OTHER LIABILITIES",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 4,
            "childs": [
                {
                    "title": "LONG TERM LIABILITIES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "LAHORE OFFICE C/A",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCRUED RECEIVABLE & PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "PEGASUS AIRLINE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "TURKISH AIR",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "QAMAR ALAM",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "CURRENT LIABILITIES",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 4,
            "childs": [
                {
                    "title": "PAYABLES IMPORT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "LEAVE DEDUCTIONS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "PAYABLES CLEARING",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SEANET SHIPPING L.L.C DXB",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Mr Hamid Payable",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Prepaid Premium",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Telenor Bill Payable",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACS Payable",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MOBILE BILL PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SESSI & EOBI PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "COMPUTERS BILL PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FOREIGN PRINCIPALS PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Legerhauser Aarau",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "CL. AGENT PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "LOAN FROM DIRECTORS",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "OTHER PAYABLE",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 4,
            "childs": [
                {
                    "title": "SALARY PAYABLE (ACS)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ELECTRICITY PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "TELEPHONE BILL PAYABLE  (SNSL)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INT'L DAILING PHONE A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCRUED HANDLING +SCANNING EXP.",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCRUED TRANSPORT A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCRUED CIVIL AVIATION",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "WASIQ SHAB PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "TELEPHONE BILL PAYABLE (ACS)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SALARY PAYABLE (SNSL)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "UFONE BILL PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCAP PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "IATA CASS ADJUSTMENT PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INTEREST PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ANNUAL FEE PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "PROVISION FOR BED DEBTS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "GAS BILLS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "WATER BILL PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "STAFF LUNCH PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCRUED AIR PORT EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "cash received",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "DRAWING BABAR SB",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "D/O CHARGES PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INTERNET BILL PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ADVANCE A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCRUED DOC.EXP",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCRUED CONVAYNCE  EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCRUED DISPATCH EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCRUED REFUND A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FREIGHT CHARGES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCRUED FUEL EXP",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCRUED MAINTENANCE EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCRUED UTILITIES EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ACCRUED SALES TAX",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "CONTAINER CHARGES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "PETTY CASH DEPOSIT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ICM ( NEW )",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "VEY - FLUID TECHNOLOGY INT.",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MMS - SECURITIES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "LOTUS FOODS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INT'L DAILING PHONE EXP.",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "REBATE PAYABLE",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "ACCOUNT PAYABLE",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 4,
            "childs": []
        },
        {
            "title": "OTHER CAPITALS",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 5,
            "childs": [
                {
                    "title": "CONTRA ACCOUNT OPENINIG",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "PAID UP CAPITAL",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "IFA A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MR. HUMAYUN QAMAR (PROPRIETOR)",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "CAPITAL COMPANY",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 5,
            "childs": [
                {
                    "title": "DIRECTOR CAPITAL",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "CAPITAL DIRECTORS",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 5,
            "childs": [
                {
                    "title": "CAPITAL abc",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MR. HUMAYUN QAMAR (PARTNER)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MR. QAMAR ALAM (PARTNER)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MRS. ZAREEN QAMAR (PARTNER)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MRS. HINA ADNAN KHAN (PARTNER)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MISS. SHAJIA QAMAR (PARTNER)",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "PROFIT & LOSS SUMMARY",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 5,
            "childs": [
                {
                    "title": "PROFIT & LOSS B/F",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "DIRECTORS DRAWING",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 5,
            "childs": [
                {
                    "title": "MR. HOMAYOUN QAMAR ALAM",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "DRAWING",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MR. QAMAR ALAM (DRAWING)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MRS. ZAREEN QAMAR (DRAWING)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MRS. HINA ADNAN KHAN (DRAWING)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MISS. SHAJIA QAMAR (DRAWING)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SEA NET TECHNOLOGIES",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "INCOMES",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 2,
            "childs": [
                {
                    "title": "INCOME FROM CLEARING",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INCOME FROM IMPORT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "EX-CHANGE RATE GAIN / LOSS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "AIR IMPORT INCOME",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "SELLING REVENUE",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 2,
            "childs": [
                {
                    "title": "FCL FREIGHT INCOME",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "LCL FREIGHT INCOME",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "OPEN TOP FREIGHT INCOME",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "IMPORT FREIGHT INCOME",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "IMPORT INSURANCE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "D/O INCOME",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "AIR FREIGHT INCOME",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "AIR SALES DISCOUNT",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "OTHER REVENUE",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 2,
            "childs": [
                {
                    "title": "MISC. INCOME",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "REBATE INCOME",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "CNTR HANDLING INCOME",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INTEREST INCOME",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "K.B INCOME",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INTEREST PAID",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "RENTAL INCOME",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "DETENTION INCOME",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "OTHER EXPENSES",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 1,
            "childs": [
                {
                    "title": "GENERAL",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "COMMISSION A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "B/L STUMPPING",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MARKETING EXP.",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "VEHICLE & RUNNING EXP.",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "RECOVERY EXP.",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "TRAVELLING EXP.",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "BAD DEBTS EXP",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "COMMISSION A/C SEA SHIPMENTS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SALES PROMOTION EXP",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SOFTWARE & DEVLOPMENT A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "COMMISSION A/C AIR SHIPMENTS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "COMMISSION ON RECOVERY",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SCS COURIER EXP",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SALES TAX EXP (SRB)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "COUNTERA ENTRY",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "CONSTRUCTION A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "CIVIL AVIATION RENT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "COMMISSION EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SALES TAX SNSL",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "REFUND EXPENSES (HAROON)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INTEREST EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SOFTWARE & DEVELOPMENT EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "SELLING EXPENSES",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 1,
            "childs": [
                {
                    "title": "CLEARING EXPENSE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "BAD DEBTS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "REFUND TO AIRLINE & SHIPPING LINE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FCL FREIGHT EXPENSE",
                    "subCategory": "COGS",
                    "editable": "1"
                },
                {
                    "title": "FCL REBATE EXPENSE",
                    "subCategory": "COGS",
                    "editable": "1"
                },
                {
                    "title": "DOCS EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "LCL FREIGHT EXPENSE",
                    "subCategory": "COGS",
                    "editable": "1"
                },
                {
                    "title": "LCL REBATE EXP.",
                    "subCategory": "COGS",
                    "editable": "1"
                },
                {
                    "title": "SHORT PAYMENT EXPESNES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "OPENT TOP FREIGHT EXP",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "OPENT TOP REBATE EXP",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "IMPORT EXPENSES",
                    "subCategory": "COGS",
                    "editable": "1"
                },
                {
                    "title": "D/O CHARGES.",
                    "subCategory": "COGS",
                    "editable": "1"
                },
                {
                    "title": "AIR FREIGHT EXPENSE",
                    "subCategory": "COGS",
                    "editable": "1"
                },
                {
                    "title": "AIR PORT EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "ADMIN. EXP",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 1,
            "childs": [
                {
                    "title": "ZAKAT EXP",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Motor Vehicle Tax",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Audit Expence",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Courier Charges",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "OPRATING EXPENSES",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 1,
            "childs": [
                {
                    "title": "ADVERTISEMENT EXP.",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "B/L ADHESIVE CHARGES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "BROKERAGE & COMMISSION",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "CHARITY & DONATION",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "COMPUTER EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "CONVEYANCE EXP.",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "DIRECTORS REMUNIRATION",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ELECTRICITY CHARGES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ENTERTAINMENT EXP.",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "EQUIPMENT REPAIR",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FEES & TAXES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INTERNET/ EMAIL / FAXES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "LEGAL & PROFESSIONAL",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "LICENCE FEE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MISC. EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MOBILE EXP.",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "NEWS PAPER & PERIODICAL",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "OFFICE REPAIR & MAINTENANCE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "PHOTO STAT",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "POSTAGE & TELEGRAME",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "PRINTING & STATIONERY",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "RENT EXPENSE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SALARIES & ALLOWANCES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "STAFF BONUS",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "TELEPHONE & FAX BILL EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "WAGES EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "STAFF WALFARE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "GENERATOR EXPENSE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SECURITY & SERVICES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "CLIMAX SOFTWARE EXP",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INSURANCE EXP (TOYOTA)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INSURANCE EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "EOBI EXPENSE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "DONATION",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INCOME TAX (SALARY)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INCOM TAX ELECTRICITY",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "GENERAL SALES TAX ELECTRICITY",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "STATIONARY EXPENSE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "CONVAYNCE EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "DISPATCH EXPESNES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "FUEL & OIL EXPESNES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INTERNET & DSL EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "WATER BILL EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "WATER BILL EXPESNES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "UTILITIES EXPENSES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "INCOM TAX",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Guest House Repairing & Maintenance",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "Bank Charges (Sunil)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "UNITED INSURANCE  CO",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SALARIES & ALLOWANCES (ACS)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "OFFICE DESIGNING",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "PORT EXPENSES",
                    "subCategory": "Admin Expense",
                    "editable": "1"
                },
                {
                    "title": "VEHICLE REPAIR AND MAINTENANCE",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        },
        {
            "title": "BANK & FINANCIAL CHARGES",
            "editable": "1",
            "CompanyId": 1,
            "subCategory": "Parent",
            "AccountId": 1,
            "childs": [
                {
                    "title": "BANK CHARGES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "MARKUP CHARGES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "PIA (Bank Charges)",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "COMMISSION AGAINST BANK GUARANTEE",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "COMMISSION ADV A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "ENTERTRANSFER A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "S.E.S.S.I",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "READY LOAN A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "OUT DOOR FUEL EXP",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "CUSTOM CLEARING CHARGES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "PANALTY CHARGES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "WATER & SAVERAGE BOARD BILL",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "LABOUR CHARGES",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "CAR INSTALMENT A/C",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "SUI GAS BILL",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "U.B.L  BANK",
                    "subCategory": "General",
                    "editable": "1"
                },
                {
                    "title": "CREDIT CARDS A/C",
                    "subCategory": "General",
                    "editable": "1"
                }
            ]
        }
    ];

    try { 
      for (let i = 1; i <= 3; i++) {
        let newObj = [];
        await obj.forEach((x)=>{
          newObj.push({...x, CompanyId:i})
        })
        await newObj.forEach(async(x)=>{
            const result = await Parent_Account.create(x).catch((z)=>console.log(z))
            if(x.childs.length>0){
              let tempAccounts = [];
              x.childs.forEach((y)=>{
                tempAccounts.push({...y, ParentAccountId:result.id})
              })
              await Child_Account.bulkCreate(tempAccounts).catch((z)=>console.log(z))
            }
        });
        
    }

    await res.json({status:'success'});
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});

routes.post("/accountDelete", async(req, res) => {
  try {
    await Parent_Account.destroy({where:{editable:'1'}})
    await Child_Account.destroy({where:{}})
    await Clients.destroy({where:{}})
    await Client_Associations.destroy({where:{}})
    res.json({status:'success'});
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});
routes.post("/accountVendorsAndAssociations", async(req, res) => {
  try {

    await Vendors.destroy({where:{}})
    await Vendor_Associations.destroy({where:{}})
    res.json({status:'success'});
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});

module.exports = routes;