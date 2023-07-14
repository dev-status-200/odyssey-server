const { SE_Job, SE_Equipments, Container_Info, Bl, Stamps, Job_notes, Loading_Program } = require("../../functions/Associations/jobAssociations/seaExport");
// const {Bl, Stamps} = require("../../functions/Associations/stamps")
const { Employees } = require("../../functions/Associations/employeeAssociations");
const { Vendors } = require("../../functions/Associations/vendorAssociations");
const { Clients }=require("../../functions/Associations/clientAssociation")
const { Commodity, Vessel, Charges }=require("../../models");
const routes = require('express').Router();
const Sequelize = require('sequelize');
const moment = require("moment");
const { Voyage } = require("../../functions/Associations/vesselAssociations");
const Op = Sequelize.Op;

const getJob = (id) => {
    const finalResult = SE_Job.findOne({
        where:{id:id},
        include:[
            { model:SE_Equipments },
            { model:Clients, attributes:['name'] }
        ]
    })
    return finalResult
}

routes.get("/getValues", async(req, res) => {
    let makeResult = (result, resultTwo) => {
        let finalResult = {shipper:[], consignee:[], notify:[], client:[]};
        result.forEach((x) => {
            if(x.types.includes('Shipper')){
                finalResult.shipper.push({name:`${x.name} (${x.code})`, id:x.id, types:x.types})
            }
            if(x.types.includes('Consignee')){
                finalResult.consignee.push({name:`${x.name} (${x.code})`, id:x.id, types:x.types})
            }
            if(x.types.includes('Notify')){
                finalResult.notify.push({name:`${x.name} (${x.code})`, id:x.id, types:x.types})
            }
        })
        finalResult.client = resultTwo.map((x)=>{
            return {name:`${x.name} (${x.code})`, id:x.id, types:x.types}
        });
        return finalResult
    }
    let makeResultTwo = (result) => {
    let finalResult = {transporter:[], forwarder:[], overseasAgent:[], localVendor:[], chaChb:[], sLine:[]};
    result.forEach((x) => {
        if(x.types.includes('Transporter')){
            finalResult.transporter.push({name:`${x.name} (${x.code})`, id:x.id, types:x.types})
        }
        if(x.types.includes('Forwarder/Coloader')){
            finalResult.forwarder.push({name:`${x.name} (${x.code})`, id:x.id, types:x.types})
        }
        if(x.types.includes('Overseas Agent')){
            finalResult.overseasAgent.push({name:`${x.name} (${x.code})`, id:x.id, types:x.types})
        }
        if(x.types.includes('CHA/CHB')){
            finalResult.chaChb.push({name:`${x.name} (${x.code})`, id:x.id, types:x.types})
        }
        if(x.types.includes('Local Vendor')){
            finalResult.localVendor.push({name:`${x.name} (${x.code})`, id:x.id, types:x.types})
        }
        if(x.types.includes('Shipping Line')){
            finalResult.sLine.push({name:`${x.name} (${x.code})`, id:x.id, types:x.types})
        }
    })
    return finalResult
    }
    try {
        const resultOne = await Clients.findAll({ 
            attributes:['id','name', 'types', 'code'],
            order: [['createdAt', 'DESC']]
        })
        const result = await Clients.findAll({ 
            where: {
                types: {
                [Op.or]:[
                    { [Op.substring]: 'Shipper' },
                    { [Op.substring]: 'Consignee' },
                    { [Op.substring]: 'Notify' }]
            }},
            attributes:['id','name', 'types', 'code'],
            order: [['createdAt', 'DESC']]
        })
        const resultThree = await Vendors.findAll({ 
            where: {
                types: {
                [Op.or]:[
                    { [Op.substring]: 'Transporter' },
                    { [Op.substring]: 'Forwarder/Coloader' },
                    { [Op.substring]: 'Local Vendor' },
                    { [Op.substring]: 'CHA/CHB' },
                    { [Op.substring]: 'Overseas Agent' },
                    { [Op.substring]: 'Shipping Line' }
                ]
            }},
            attributes:['id','name', 'types', 'code'],
            order: [['createdAt', 'DESC']]
        })
        const resultTwo = await Commodity.findAll({
            order: [['createdAt', 'DESC']],
            attributes:['id','name', 'hs'],
        });

        const resultFour = await Vessel.findAll({
            order: [['createdAt', 'DESC']],
            attributes:['id', 'name', 'code', 'carrier'],
            include:[{
                model:Voyage
            }]
        });
        const Sr = await Employees.findAll({where:{represent: {[Op.substring]: 'sr'} }, attributes:['id', 'name']});
        const charges = await Charges.findAll();
        res.json({
            status:'success',
            result:{
                party:makeResult(result, resultOne),
                vendor:makeResultTwo(resultThree),
                commodity:resultTwo,
                vessel:resultFour,
                sr:Sr,
                chargeList:charges
            }
        });
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.post("/getNotes", async(req, res) => {
    try {
        console.log(req.body)
        const result = await Job_notes.findAll({
            where:{type:"SE", recordId:req.body.id},
            order:[["createdAt", "DESC"]],
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getAllNotes", async(req, res) => {
    try {
        console.log(req.body)
        const result = await Job_notes.findAll({
            // where:{type:"SE", recordId:req.body.id},
            order:[["createdAt", "DESC"]],
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.post('/updateNotes', async(req, res) => {
    try {
     const result =  await Job_notes.update({opened : req.body.data.opened}, {where : {recordId : req.body.data.recordId}})
     res.json({ status: "success", result:result})
    }
    catch (err) {
     res.json({ status: "error", result:err.message})
 
    }
 })
routes.post("/addNote", async(req, res) => {
    try {
        console.log(req.body)
        const result = await Job_notes.create(req.body);
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.post("/create", async(req, res) => {
    const createEquip = (list, id) => {
        let result = [];
        list.forEach((x)=>{
            if(x.size!=''&&x.qty!='', x.dg!='', x.teu!=''){
                delete x.id
                result.push({...x, SEJobId:id, teu:`${x.teu}`})
            }
        })
        return result;
    }
    try {
        let data = req.body.data
        delete data.id
        data.customCheck = data.customCheck.toString();
        data.transportCheck = data.transportCheck.toString();
        const check = await SE_Job.findOne({order: [ [ 'jobId', 'DESC' ]], attributes:["jobId"]});
        const result = await SE_Job.create({
            ...data,
            jobId:check==null?1:parseInt(check.jobId)+1, jobNo:`SNS-SEJ-${check==null?1:parseInt(check.jobId)+1}/${moment().format("YY")}`
        })
        console.log(result.id)
        await SE_Equipments.bulkCreate(createEquip(data.equipments,  result.id)).catch((x)=>console.log(x))
        res.json({status:'success', result:await getJob(result.id)});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.post("/edit", async(req, res) => {
    const createEquip = (list, id) => {
        let result = [];
        list.forEach((x)=>{
            if(x.size!=''&&x.qty!='', x.dg!='', x.teu!=''){
                delete x.id
                result.push({...x, SEJobId:id, teu:`${x.teu}`})
            }
        })
        return result;
    }
    try {
        let data = req.body.data
        data.customCheck = data.customCheck.toString();
        data.transportCheck = data.transportCheck.toString();
        data.approved = data.approved.toString();
        await SE_Job.update(data,{where:{id:data.id}}).catch((x)=>console.log(1));
        await SE_Equipments.destroy({where:{SEJobId:data.id}}).catch((x)=>console.log(2))
        await SE_Equipments.bulkCreate(createEquip(data.equipments, data.id)).catch((x)=>console.log(x))
        res.json({status:'success', result:await getJob(data.id)});
    }  
    catch (error) {
        console.log(error.message)
      res.json({status:'error', result:error.message});
    }
});
  
routes.get("/get", async(req, res) => {
    try {
        const result = await SE_Job.findAll({
            where:{companyId:req.headers.companyid},
            include:[
                {model:Voyage},
                {model:Employees, as:'created_by', attributes:['name'] },
                {model:SE_Equipments},
                {
                    model:Clients,
                    attributes:['name']
                }
            ],
            order:[["createdAt", "DESC"]],
        }).catch((x)=>console.log(x))
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getJobById", async(req, res) => {
    try {
        const result = await SE_Job.findOne({
            where:{id:req.headers.id},
            include:[
                {model:SE_Equipments},
                {
                    model:Clients,
                    attributes:['name']
                }
            ],
            order:[["createdAt", "DESC"]],
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getSEJobIds", async(req, res) => {
    try {
        const result = await SE_Job.findAll({
            attributes:['id']
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getSEJobById", async(req, res) => {
    try {
        const result = await SE_Job.findOne({
            where:{id:req.headers.id},
            include:[
                {model:Bl, attributes:['id']},
                {model:Voyage},
                {model:SE_Equipments},
                {
                    model:Clients,
                    attributes:['name']
                }
            ],
            order:[["createdAt", "DESC"]],
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getJobsWithoutBl", async(req, res) => {
    const attr = [
        'name', 'address1', 'address1', 'person1', 'mobile1',
        'person2', 'mobile2', 'telephone1', 'telephone2', 'infoMail'
    ]
    try {
    const result = await SE_Job.findAll({
        //where:{"approved": "true"},
        attributes:[
            'id', 'jobNo', 'pol',
            'pod', 'fd', 'jobDate',
            'shipDate', 'cutOffDate',
            'delivery', 'freightType'
        ],
        order:[["createdAt", "DESC"]],
        include:[
            { model:Bl },
            { model:SE_Equipments, attributes:['qty', 'size'] },
            { model:Clients,  attributes:attr },
            { model:Clients, as:'consignee', attributes:attr },
            { model:Clients, as:'shipper', attributes:attr },
            { model:Vendors, as:'overseas_agent', attributes:attr },
            { model:Commodity, as:'commodity' },
            { model:Vessel, as:'vessel', attributes:['name'] }
        ]
    });
    res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.post("/createBl", async(req, res) => {
    try {
        let data = req.body;
        delete data.id
        const check = await Bl.findOne({order: [ [ 'no', 'DESC' ]], attributes:["no"]})
        const result = await Bl.create({...data, 
            no:check==null?1:parseInt(check.no)+1, hbl:`SNSL${check==null?1:parseInt(check.no)+1}`
        }).catch((x)=>console.log(x))
        await data.Container_Infos.forEach((x, i)=>{
            data.Container_Infos[i] = {...x, BlId:result.id}
        })
        await Container_Info.bulkCreate(data.Container_Infos).catch((x)=>console.log(x))
        res.json({status:'success', result:result.id  });
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.post("/editBl", async(req, res) => {
    try {
        let data = req.body;
        //delete data.id;
        await Bl.update(data, {where:{id:data.id}});
        data.Container_Infos.forEach((x, i)=>{
            data.Container_Infos[i] = {
                ...x, BlId:data.id, 
                pkgs:x.pkgs.toString(),
                gross:x.gross.toString(),
                net:x.net.toString(),
                tare:x.tare.toString(),
                cbm:x.cbm?.toString(),
            }
        })
        const result = await Container_Info.bulkCreate(data.Container_Infos,{
            updateOnDuplicate: [
                "pkgs", "no", "seal", "size", "rategroup", "gross", "net", "tare", "wtUnit", "cbm", "pkgs", "unit", "temp", "loadType", "remarks", "detention",  "demurge", "plugin", "dg", "number", "date", "top", "right", "left", "front", "back"
            ],
        });

        Stamps.destroy({ where:{id:data.deleteArr} })
        Container_Info.destroy({ where:{id:req.body.deletingContinersList} })
        await data.stamps?.map((x) => Stamps.upsert({...x, BlId:req.body.id}));
        res.json({status:'success', result: result});   
    } 
    catch (error) {
        console.log(error)
      res.json({status:'error', result:error});  
    } 
}); 

routes.post("/findJobByNo", async(req, res) => {
    try {
        const attr = [
            'name', 'address1', 'address1', 'person1', 'mobile1',
            'person2', 'mobile2', 'telephone1', 'telephone2', 'infoMail'
        ]
        const result = await SE_Job.findAll({
            where:{jobNo:req.body.no},
            attributes:[
                'id', 'jobNo', 'pol',
                'pod', 'fd', 'jobDate',
                'shipDate', 'cutOffDate',
                'delivery', 'freightType',
                'freightPaybleAt','VoyageId'
            ],
            order:[["createdAt", "DESC"]],
            include:[
                { model:SE_Equipments, attributes:['qty', 'size'] },
                { model:Clients,  attributes:attr },
                { model:Clients, as:'consignee', attributes:attr },
                { model:Clients, as:'shipper', attributes:attr },
                { model:Vendors, as:'overseas_agent', attributes:attr },
                { model:Commodity, as:'commodity' },
                { model:Vessel,  as:'vessel', attributes:['name'] },
                { model:Voyage, attributes:['voyage'] },
                
            ]
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getAllBls", async(req, res) => {
    try {
        const result = await Bl.findAll({
            include:[
                { model:SE_Job, attributes:["jobNo"] },
                { model:Container_Info }
            ]
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getBlById", async(req, res) => {
    try {
        const result = await Bl.findOne({
            where:{id:req.headers.id},
            include:[
                {
                    model:SE_Job,
                    attributes:["jobNo"]
                },
                {model: Stamps},
                { model:Container_Info }
            ]
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getStamps", async(req, res) => {
    try {
        const result = await Stamps.findAll({
            where:{BlId:req.headers.id},
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
}); 

routes.get("/getLoadingProgram", async(req, res) => {
    try {
        const result = await Loading_Program.findOne({
            where:{SEJobId:req.headers.id},
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
}); 

routes.post("/upsertLoadingProgram", async(req, res) => {
    try {
        const result = await Loading_Program.upsert(req.body)
        .catch((x)=>console.log(x))
        res.json({status:'success', result:result});
        console.log(req.body)
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
}); 

module.exports = routes;