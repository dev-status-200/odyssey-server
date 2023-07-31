const { Charge_Head, Invoice, Invoice_Losses } = require("../../functions/Associations/incoiceAssociations");
const { SE_Job, SE_Equipments, Bl } = require("../../functions/Associations/jobAssociations/seaExport");
const { Child_Account, Parent_Account } = require("../../functions/Associations/accountAssociations");
const { Access_Levels, Employees } = require("../../functions/Associations/employeeAssociations");
const { Vouchers, Voucher_Heads } = require("../../functions/Associations/voucherAssociations");
const { Vendor_Associations } = require("../../functions/Associations/vendorAssociations");
const { Client_Associations } = require("../../functions/Associations/clientAssociation");
const { Vendors } = require("../../functions/Associations/vendorAssociations");
const { Voyage } = require('../../functions/Associations/vesselAssociations');
const { Clients }=require("../../functions/Associations/clientAssociation");
const { Accounts, Vessel } = require("../../models");
const routes = require('express').Router();
const Sequelize = require('sequelize');
const { Router } = require("express");
const moment = require("moment");
const Op = Sequelize.Op;
//const numCPUs = require('os').cpus().length;

// Invoice statuses
// 1 = unpaid
// 2 = paid
// 3 = not fully paid

const chardHeadLogic = (currency) => {
  let result={};
      if(currency!=undefined){
        result = { currency:currency }
      }
      return result;
}

routes.post("/approveCharges", async(req, res) => {
    try {
      let tempIds = [];
      req.body.forEach((x) => { tempIds.push(x.InvoiceId) });

      const lastJB = await Invoice.findOne({ where:{type:'Job Bill'}, order: [[ 'invoice_Id', 'DESC' ]], attributes:["invoice_Id"]});
      const lastJI = await Invoice.findOne({ where:{type:'Job Invoice'}, order: [[ 'invoice_Id', 'DESC' ]], attributes:["invoice_Id"]});
      const lastAI = await Invoice.findOne({ where:{type:'Agent Invoice'}, order: [[ 'invoice_Id', 'DESC' ]], attributes:["invoice_Id"]});
      const lastAB = await Invoice.findOne({ where:{type:'Agent Bill'}, order: [[ 'invoice_Id', 'DESC' ]], attributes:["invoice_Id"]});

      let result = await Invoice.findAll({where:{id:tempIds}});
      let vouchers = [];
      result.forEach(async(x, i) => {
        if(x.status=='0' && x.type=='Job Bill'){
          result[i].status="1"
          result[i].invoice_Id= lastJB.invoice_Id==null?1: parseInt(lastJB.invoice_Id)+1;
          result[i].invoice_No=lastJB.invoice_Id==null?
          `SNS-JB-${1}/${moment().format("YY")}`:
          `SNS-JB-${ parseInt(lastJB.invoice_Id)+1}/${moment().format("YY")}`
        }
        if(x.status=='0' && x.type=='Job Invoice'){
          result[i].status="1"
          result[i].invoice_Id= lastJI.invoice_Id==null?1: parseInt(lastJI.invoice_Id)+1;
          result[i].invoice_No=lastJI.invoice_Id==null?
          `SNS-JI-${1}/${moment().format("YY")}`:
          `SNS-JI-${ parseInt(lastJI.invoice_Id)+1}/${moment().format("YY")}`
        }
        if(x.status=='0' && x.type=='Agent Invoice'){
          result[i].status="1"
          result[i].invoice_Id= lastAI.invoice_Id==null?1: parseInt(lastAI.invoice_Id)+1;
          result[i].invoice_No=lastAI.invoice_Id==null?
          `SNS-AI-${1}/${moment().format("YY")}`:
          `SNS-AI-${ parseInt(lastAI.invoice_Id)+1}/${moment().format("YY")}`
        }
        if(x.status=='0' && x.type=='Agent Bill'){
          result[i].status="1"
          result[i].invoice_Id= lastAB.invoice_Id==null?1: parseInt(lastAB.invoice_Id)+1;
          result[i].invoice_No=lastAB.invoice_Id==null?
          `SNS-AB-${1}/${moment().format("YY")}`:
          `SNS-AB-${ parseInt(lastAB.invoice_Id)+1}/${moment().format("YY")}`
        }
      })

      await res.json({status: 'success', result: result});
    }
    catch (error) {
      res.json({status: 'error', result: error});
    }
});

routes.post("/updateCharges", async(req, res) => {
    try {
      req.body.invoice.forEach(async(x)=>{
        await Invoice.update(x,{where:{id:x.id}})
        req.body.charges.forEach(async(y)=>{
          if(x.type==y.invoiceType && y.InvoiceId==x.id){
            await Charge_Head.update({...y, invoice_id:x.invoice_No, status:"1"},{where:{id:y.id}})
          }
        })
      })
      await res.json({status: 'success', result: 'result'});
    }
    catch (error) {
      res.json({status: 'error', result: error});
    }
}); 

routes.post("/saveHeades", async(req, res) => {

  const makeHeads = (data, id) => {
    let result = [];
    data.forEach((x, i)=>{
      result.push({...x, InvoiceId:id})
    });
    return result
  }
  try {
    await Charge_Head.destroy({where:{id:req.body.deleteList}})
    let tempData = [...req.body.invoices];
    const prevInv = await Invoice.findAll({where:{SEJobId:req.body.invoices[0].SEJobId}});
    let tempPrevVal = [];
    prevInv.forEach((z)=>{
      tempPrevVal.push(z.dataValues)
    })
    tempData.forEach((x, i)=>{
      tempData[i].partyType=x.charges[0].partyType;  //<-- Defines The PartyType From Charge Head to Invoice
      tempPrevVal.forEach((y, j)=>{
        if(x.party_Id==y.party_Id && x.type==y.type){
          tempData[i].id=y.id;
          tempPrevVal.splice(j, 1);
        }
      })
    })
    req.body.invoices = tempData;
    for(let i = 0; i<req.body.invoices.length;i++){
      if(req.body.invoices[i].id==null){
        const result = await Invoice.create(req.body.invoices[i]);
        await Charge_Head.bulkCreate(makeHeads(req.body.invoices[i].charges, result.id))
      }

      if(req.body.invoices[i].id!=null){
        for(let j = 0; j<req.body.invoices[i].charges.length;j++){
          //await Invoice.update({req.body.invoices[i], where:{ id:invoices[i].id }});
          await Invoice.update({currency:req.body.invoices[i].currency},{where:{id:req.body.invoices[i].id}});

          if(req.body.invoices[i].charges[j].id!=null){
            await Charge_Head.update(req.body.invoices[i].charges[j], {where:{id:req.body.invoices[i].charges[j].id}})
          }else{
            let val = {...req.body.invoices[i].charges[j], InvoiceId:req.body.invoices[i].id}
            await Charge_Head.create(val);
          }
        }
      }
    }
    res.json({status:'success'});
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});

routes.get("/getJobInvoices", async(req, res) => {
  try {
    const result = await Invoice.findAll({
      where:{SEJobId:req.headers.id},
      include:[{
        model:Charge_Head,
      }]
    })
    res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getFilteredInvoices", async(req, res) => {
  try {
    const result = await Invoice.findAll({
      where:{type:req.headers.type},
      attributes:['id', 'invoice_No', 'status', 'operation', 'currency', 'ex_rate', 'party_Name', 'total', 'partyType', 'approved'],
      include:[
      { model:SE_Job, attributes:['jobNo'] },
      {
        model:Charge_Head,
        attributes:['charge'],
        where:{charge:{ [Op.ne]: null }}
      }]
    })
    res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getInvoiceByNo", async(req, res) => {
  try {
    const attr = [
      'name', 'address1', 'address1', 'person1', 'mobile1',
      'person2', 'mobile2', 'telephone1', 'telephone2', 'infoMail'
    ];
    const resultOne = await Invoice.findOne({
      where:{invoice_No:req.headers.invoice_no.toUpperCase()},
      include:[
        { model:Charge_Head },
        {
          model:SE_Job,
          attributes:[
            'jobNo', 'jobDate', 'shipDate', 'pol', 'pod', 'fd', 'vol', 'weight', 'pcs'
          ],
          //attributes:['id'],
          include:[
            { model:Bl , attributes:['mbl', 'hbl'] },
            { model:Voyage , attributes:['voyage', 'importArrivalDate', 'exportSailDate'] },
            { model:Clients, attributes:attr },
            { model:Clients, as:'consignee', attributes:attr },
            { model:Clients, as:'shipper', attributes:attr },
            { model:Vendors, as:'shipping_line', attributes:attr },
            { model:Employees, as:'sales_representator', attributes:['name'] },
            { model:Vessel, as:'vessel', attributes:['carrier', 'name'] },
            //{ model:Voyage },
          ]
        },
      ],
      order: [
        [{ model: Charge_Head }, 'id', 'ASC'],
      ]
    });
      res.json({status:'success', result:{ resultOne }});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getAllInoivcesByPartyId", async(req, res) => {
  
  try {
    //console.log(req.headers)
    const result = await Invoice.findAll({
      where:{
        approved:"1",
        party_Id:req.headers.id,
        payType:req.headers.pay,
        status:{ [Op.ne]: '2' },
        ...chardHeadLogic(req.headers.invoicecurrency)
      },
      attributes:['id','invoice_No', 'invoice_Id', 'recieved', 'paid', 'status', 'total', 'currency', 'roundOff', 'party_Id'],
      order:[['invoice_Id', 'ASC']],
      include:[
        {
          model:SE_Job,
          attributes:['jobNo', 'subType']
        },
        {
          model:Charge_Head,
          attributes:['net_amount', 'local_amount', 'currency', 'ex_rate']
        }
      ]
    });
    let partyAccount = null;
    if(result.length>0){
      if(req.headers.party=="vendor"){
        console.log("Inside Vendor Association")
        partyAccount = await Vendor_Associations.findAll({
          where:{
            VendorId:result[0].party_Id,
            CompanyId:req.headers.companyid  //<-- I'm Unsure About This 
          },
          include:[
            {
              model:Child_Account,
              include:[
                {
                  model:Parent_Account,
                  where:{ title:req.headers.pay=="Recievable"?"Accounts Recievable":"Accounts Payble" }
                }
              ]
            }
          ]
        })
      } else if(req.headers.party=="agent"){
        console.log("Inside Agent Association")
        partyAccount = await Vendor_Associations.findAll({
          where:{
            VendorId:result[0].party_Id,
            CompanyId:req.headers.companyid  //<-- I'm Unsure About This 
          },
          include:[
            {
              model:Child_Account,
              include:[
                {
                  model:Parent_Account,
                  where:{ title:req.headers.pay=="Recievable"?"Accounts Recievable":"Accounts Payble" }
                }
              ]
            }
          ]
        })
      }else {
        console.log("Inside Client Association")
        partyAccount = await Client_Associations.findAll({
          where:{ ClientId:result[0].party_Id, CompanyId:req.headers.companyid },
          include:[
            {
              model:Child_Account,
              include:[
                {
                  model:Parent_Account,
                  where:{ title:req.headers.pay=="Recievable"?"Accounts Recievable":"Accounts Payble" }
                }
              ]
            }
          ]
        });
      }
    }
    res.json({ status:'success', result:result, account:partyAccount });
    }
    catch (error) {
      res.json({status:'error', result:error});
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

routes.post("/createInvoiceTransaction", async(req, res) => {
  try {
    req.body.invoices.forEach(async(x)=>{
      await Invoice.update(x, {where:{id:x.id}});
    })
    await Invoice_Losses.bulkCreate(req.body.invoiceLosses);
    await res.json({status: 'success', result: 'result'});
  }
  catch (error) {
    res.json({status: 'error', result: error});
  }
});

routes.post("/roundOffInv", async(req, res) => {
  try {
    await Invoice.update({ roundOff:req.body.roundOff }, { where:{id:req.body.id} });
    await res.json({status: 'success', result: 'result'});
  }
  catch (error) {
    res.json({status: 'error', result: error});
  }
});

routes.post("/invApproveDisapp", async(req, res) => {
  try {
    await Invoice.update({ total:req.body.total, approved:req.body.approved, ex_rate:req.body.exRate, status:"1" }, { where:{id:req.body.id} });
    await res.json({status: 'success', result: 'result'});
  }
  catch (error) {
    res.json({status: 'error', result: error});
  }
});

routes.post("/saveHeadesNew", async(req, res) => {
  try {
    await Charge_Head.destroy({where:{id:req.body.deleteList}})
    await SE_Job.update({exRate:req.body.exRate}, {where:{id:req.body.id}})
    const start = await Date.now();
    await Promise.all([
      req.body.charges.forEach((x) => {
        Charge_Head.upsert(x);
      })
    ]);
    const end = await Date.now();
    console.log(`Execution time: ${end - start} ms`);
    res.json({status:'success'});
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});

routes.get("/getHeadesNew", async(req, res) => {
  try {
    const result = await Charge_Head.findAll({
      where:{SEJobId:req.headers.id},
      include:[{model:Invoice, attributes:['status', 'approved']}]
    })
    res.json({status:'success', result});
  }
  catch (error) {
    res.json({status:'error', result:error});
  }
});

const createInvoices = (lastJB, init, type, companyId, operation, x) => {
  //console.log(x);
  let company = '';
  company = companyId=='1'?"SNS":companyId=='2'?"CLS":"ACS";
  let result = {
    invoice_No:lastJB==null?`${company}-${init}-${1}/${moment().format("YY")}`:`${company}-${init}-${ parseInt(lastJB.invoice_Id)+1}/${moment().format("YY")}`,
    invoice_Id: lastJB==null?1: parseInt(lastJB.invoice_Id)+1,
    type:type,
    companyId:companyId,
    operation:operation,
    payType: x.type,
    party_Id: x.partyId,
    party_Name: x.name,
    SEJobId: x.SEJobId,
    currency:x.currency,
    ex_rate:x.ex_rate,
    partyType:x.partyType,
  }
  return result
}

routes.post("/makeInvoiceNew", async(req, res) => {
  try {
    let result = req.body.chargeList, charges = [], createdInvoice = { };
    const lastJB = await Invoice.findOne({ where:{type:'Job Bill'}, order: [[ 'invoice_Id', 'DESC' ]], attributes:["invoice_Id"]});
    const lastJI = await Invoice.findOne({ where:{type:'Job Invoice'}, order: [[ 'invoice_Id', 'DESC' ]], attributes:["invoice_Id"]});
    const lastAI = await Invoice.findOne({ where:{type:'Agent Invoice'}, order: [[ 'invoice_Id', 'DESC' ]], attributes:["invoice_Id"]});
    const lastAB = await Invoice.findOne({ where:{type:'Agent Bill'}, order: [[ 'invoice_Id', 'DESC' ]], attributes:["invoice_Id"]});

    await result.forEach(async(x)=>{
      if(x.invoiceType=="Job Bill"){
        if(Object.keys(createdInvoice).length==0){
          createdInvoice = createInvoices(lastJB, "JB", "Job Bill", req.body.companyId,"SE", x)
        }
        charges.push({...x, status:"1", invoice_id:createdInvoice.invoice_No })
      }
      if(x.invoiceType=="Job Invoice"){
        if(Object.keys(createdInvoice).length==0){
          createdInvoice = createInvoices(lastJI, "JI", "Job Invoice", req.body.companyId,"SE", x)
        }
        charges.push({...x, status:"1", invoice_id:createdInvoice.invoice_No })
      }
      if(x.invoiceType=="Agent Invoice"){
        if(Object.keys(createdInvoice).length==0){
          createdInvoice = createInvoices(lastAI, "AI", "Agent Invoice", req.body.companyId,"SE", x)
        }
        charges.push({...x, status:"1", invoice_id:createdInvoice.invoice_No })
      }
      if(x.invoiceType=="Agent Bill"){
        if(Object.keys(createdInvoice).length==0){
          createdInvoice = createInvoices(lastAB, "AB", "Agent Bill", req.body.companyId,"SE", x)
        }
        charges.push({...x, status:"1", invoice_id:createdInvoice.invoice_No })
      }
    })
    const newInv = await Invoice.create(createdInvoice);
    charges = await charges.map((x)=>{
      return{ ...x, InvoiceId:newInv.id }
    })
    await Promise.all([
      charges.forEach((x) => {
        Charge_Head.upsert(x);
      })
    ]);
    res.json({status: 'success', result: charges});
    
  }
  catch (error) {
    res.json({status: 'error', result: error});
  }
});

routes.get("/getInvoices", async(req, res) =>{
  try {
    const result = await Invoice.findAll({
      where: {SEJobId: req.headers.id},
      attributes: ['invoice_No'],
      include:[{
        model:Charge_Head,
        attributes:['charge'],
        where:{charge:{ [Op.ne]: null }}
      }]
    })
    res.json({status: 'success', result: result});
      
  }
  catch (error) {
    res.json({status: 'error', result: error});
  }
})



routes.get('/getTaskInvoices', async(req, res) => {
  try {
    const result = await Invoice.findAll({ where: {status: "2" , approved: "1"}})
    res.json({status: 'success', result: result});
  }
  catch (error) {
    res.json({status: 'error', result: error});
  }
})
module.exports = routes;        