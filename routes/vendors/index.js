const { Op } = require("sequelize");
const routes = require('express').Router();
const { History } = require("../../functions/Associations/historyAssociations");
const { Employees } = require("../../functions/Associations/employeeAssociations");
const { Vendors, Vendor_Associations } = require("../../functions/Associations/vendorAssociations");
const { Child_Account, Parent_Account } = require("../../functions/Associations/accountAssociations");

routes.post("/create", async(req, res) => {
    const createChildAccounts = (list, name) => {
        let result = [];
        list.forEach((x) => {
            //result.push({title:name+ " Payble", ParentAccountId:x.id})
            result.push({title:name+ `${x.title=="Accounts Recievable"?" Recievable":" Payble"}`, ParentAccountId:x.id})
        })
        return result;
    }
    const createAccountList = (parent, child, id) => {
        let result = [];
        parent.forEach((x, i)=>{
            result[i] = {
                VendorId:id,
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

        let parentAccountList = [{id:3, CompanyId:1}, {id:4, CompanyId:2}, {id:7, CompanyId:3},{id:2, CompanyId:1}, {id:5, CompanyId:2}, {id:6, CompanyId:3}]
        delete value.id;
        const check = await Vendors.max('code');
        value.accountRepresentatorId = value.accountRepresentatorId==""?null:value.accountRepresentatorId;
        value.authorizedById = value.authorizedById==""?null:value.authorizedById;
        const result = await Vendors.create({...value, code: parseInt(check) + 1});//.catch((x)=>console.log(x))
        const accounts = await Parent_Account.findAll({
            where: {
                CompanyId: {[Op.or]:[1, 2, 3]},
                title: {[Op.or]:['Accounts Recievable', 'Accounts Payble']}
            }
        });
        const accountsList = await Child_Account.bulkCreate(createChildAccounts(accounts, result.name));
        await Vendor_Associations.bulkCreate(createAccountList(parentAccountList, accountsList, result.id));

        const finalResult = await Vendors.findOne({
            where:{id:result.id},
            include:[{ model:Vendor_Associations }]
        });
        res.json({status:'success', result: finalResult});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.post("/edit", async(req, res) => {
    try {
        let value = req.body.data;
        value.operations = value.operations.join(', ');
        value.types = value.types.join(', ');
        await Vendors.update({...value, code: parseInt(value.code)},{where:{id:value.id}})//.catch((x)=>console.log(x))
        await History.create({
            html:req.body.history, EmployeeId:req.body.EmployeeId, updateDate:req.body.updateDate,
            recordId:value.id, type:"vendor"
        }).catch((x)=>console.log(x))
        const finalResult = await Vendors.findOne({
            where:{id:value.id},
            include:[{ model:Vendor_Associations }]
        }).catch((x)=>console.log(x))
        res.json({status:'success', result:finalResult});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/get", async(req, res) => {
    try {
        const result = await Vendors.findAll({
            // include:[{
            //     model:Vendor_Associations
            // }],
            order: [['createdAt', 'DESC'], /* ['name', 'ASC'],*/] 
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getVendorById", async(req, res) => {
    try {
        const result = await Vendors.findOne({
            where:{id:req.headers.id},
            include:[{  
                model:Vendor_Associations
            }]
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getForPartySearch", async(req, res) => {
    try {
        const result = await Vendors.findAll({
            attributes:['id', 'name', 'city', 'address1', 'address2', 'mobile1', 'mobile2', 'person2', 'person1', 'types', 'code'],
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
        const result = await Vendors.findAll({
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