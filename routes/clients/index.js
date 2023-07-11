const { Op } = require("sequelize");
const db = require("../../models");
const routes = require('express').Router();
const { History } = require("../../functions/Associations/historyAssociations");
const { Employees } = require("../../functions/Associations/employeeAssociations");
const { Clients, Client_Associations } = require("../../functions/Associations/clientAssociation");
const { Child_Account, Parent_Account } = require("../../functions/Associations/accountAssociations");

routes.post("/createClient", async(req, res) => {
    const createChildAccounts = (list, name) => {
        let result = [];
        list.forEach((x)=>{
            result.push({title:name+ `${x.title=="Accounts Recievable"?" Recievable":" Payble"}`, ParentAccountId:x.id})
        })
        return result;
    }
    const createAccountList = (parent, child, id) => {
        let result = [];
        parent.forEach((x, i)=>{
            result[i] = {
                ClientId:id,
                CompanyId:x.CompanyId,
                ParentAccountId:x.id,
                ChildAccountId:null
            }
            child.forEach((y, j)=>{
                if(y.ParentAccountId==x.id){
                    result[i].ChildAccountId=child[j].id
                }
            })
        })
        return result;
    }
    try {
        let value = req.body.data;
        value.operations = value.operations.join(', ');
        value.types = value.types.join(', ');
        delete value.id
        const check = await Clients.max('code');
        value.accountRepresentatorId = value.accountRepresentatorId==""?null:value.accountRepresentatorId;
        value.salesRepresentatorId = value.salesRepresentatorId==""?null:value.salesRepresentatorId;
        value.docRepresentatorId = value.docRepresentatorId==""?null:value.docRepresentatorId;
        value.authorizedById = value.authorizedById==""?null:value.authorizedById;
        const result = await Clients.create({...value, code : parseInt(check) + 1 }).catch((x)=>console.log(x))
        const accounts = await Parent_Account.findAll({
            where: {
                CompanyId: { [Op.or]: value.companies },
                title: { [Op.or]: ['Accounts Recievable', 'Accounts Payble'] }
            }
        });
        const accountsList = await Child_Account.bulkCreate(createChildAccounts(accounts, result.name));
        await Client_Associations.bulkCreate(createAccountList(accounts, accountsList, result.id));

        const finalResult = await Clients.findOne({
            where:{id:result.id},
            include:[{
                model:Client_Associations
            }]
        });
        res.json({status:'success', result:   finalResult});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.post("/editClient", async(req, res) => {

    const createChildAccounts = (list, name) => {
        let result = [];
        list.forEach((x)=>{
            result.push({title:name+ `${x.title=="Accounts Recievable"?" Recievable":" Payble"}`, ParentAccountId:x.id})
        })
        return result;
    }
    const createAccountList = (parent, child, id) => {
        let result = [];
        parent.forEach((x, i)=>{
            result[i] = {
                ClientId:id,
                CompanyId:x.CompanyId,
                ParentAccountId:x.id,
                ChildAccountId:null
            }
            child.forEach((y, j)=>{
                if(y.ParentAccountId==x.id){
                    result[i].ChildAccountId=child[j].id
                }
            })
        })
        return result;
    }
    try {
        let value = req.body.data;
        value.id = value.id
        value.operations = value.operations.join(', ');
        value.types = value.types.join(', ');
        const result = await Clients.update({...value, code: parseInt(value.code)},{where:{id:value.id}}).catch((x)=>console.log(1))
        if(value.companies.length>0){
            const accounts = await Parent_Account.findAll({
                where: {
                    CompanyId: { [Op.or]: value.companies },
                    title: { [Op.or]: ['Accounts Recievable', 'Accounts Payble'] }
                }
            });
            const accountsList = await Child_Account.bulkCreate(createChildAccounts(accounts, value.name)).catch((x)=>console.log(2))
            await Client_Associations.bulkCreate(createAccountList(accounts, accountsList, value.id)).catch((x)=>console.log(3))
        }
        let values = {
            html:req.body.history, EmployeeId:req.body.EmployeeId,
            updateDate:req.body.updateDate, recordId:value.id, type:"client"
        }
        await History.create(values).catch((x)=>console.log(4))
        const finalResult = await Clients.findOne({
            where:{id:value.id},
            include:[{ model:Client_Associations }]
        }).catch((x)=>console.log(5))
        console.log(finalResult)
        res.json({status:'success', result:finalResult})
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getClients", async(req, res) => {
    try {
        const result = await Clients.findAll({
            attributes:['id', 'name' , 'person1', 'mobile1', 'person2', 'mobile2', 'telephone1', 'telephone2', 'address1', 'address2', 'createdBy'],
            order: [['createdAt', 'DESC'], /* ['name', 'ASC'],*/] 
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getClientById", async(req, res) => {
    try {
        const result = await Clients.findOne({
            where:{id:req.headers.id},
            include:[{  
                model:Client_Associations
            }]
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getNotifyParties", async(req, res) => {
    try {
        const result = await Clients.findAll({
            where:{
                types:{[Op.substring]: 'Notify'}
            },
            attributes:['id','name', 'address1', 'address1', 'person1', 'mobile1',
            'person2', 'mobile2', 'telephone1', 'telephone2', 'infoMail'],
            order: [['createdAt', 'DESC'], /* ['name', 'ASC'],*/] 
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getForCharges", async(req, res) => {
    try {
        let obj = req.headers.id===undefined?{}:{id:req.headers.id};
        const result = await Clients.findAll({
            where:obj,
            attributes:["id", "name", "person2", "person1", "mobile1", "mobile2", "address1", "address2", "types", "city"],
            order: [['createdAt', 'DESC'], /* ['name', 'ASC'],*/] 
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/experimentalQuery", async(req, res) => {
    try {
        const [results, metadata] = await db.sequelize.query(
            `
            SELECT
                Clients.name,
                Employees.name AS EmployeeName,
                Clients.bank
            FROM Clients
            LEFT OUTER JOIN Employees ON Clients.accountRepresentatorId=Employees.id;
            `
            );
        res.json({status:'success', result:results});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

// routes.get("/getClientExperimental", async(req, res) => {
//     try {
//         const result = await Clients.findOne({
//             attributes:['id', 'name'],
//             include:[
//                 {
//                     model:Employees, as:"account_representator",
//                     attributes:['id', 'name'],
//                 },
//                 {
//                     model:Employees, as:"sales_representator",
//                     attributes:['id', 'name'],
//                 },
//                 {
//                     model:Employees, as:"doc_representator",
//                     attributes:['id', 'name'],
//                 },
//                 {
//                     model:Employees, as:"authorizedBy",
//                     attributes:['id', 'name'],
//                 },
//                 {
//                     model:Client_Associations,
//                     attributes:['CompanyId', 'ParentAccountId', 'ChildAccountId'],
//                 },
//             ],
//             where:{id:req.headers.id}
//         });
//         res.json({status:'success', result:result});
//     }
//     catch (error) {
//       res.json({status:'error', result:error});
//     }
// });

routes.post("/findAccounts", async(req, res) => {
    try {
        console.log(req.body);
        const result = await Parent_Account.findAll({
            where: {
                CompanyId: {
                    [Op.or]: req.body.companies
                },
                title:'Accounts Recievable'
            },
            attributes:['id', 'title']
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

module.exports = routes;