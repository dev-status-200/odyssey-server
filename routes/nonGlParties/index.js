const { Non_Gl_Parties } = require('../../models')
const routes = require('express').Router();


routes.post("/createNonGlParty", async(req, res) => {

    try {
        let value = req.body;
        value.operations = value.operations.join(', ');
        value.types = value.types.join(', ');
        delete value.id
        const check = await Non_Gl_Parties.max('code');
        const result = await Non_Gl_Parties.create({...value, code : check == null  ? 1 : parseInt(check) + 1 }).catch((x)=>console.log(x))
      
        res.json({status:'success', result: result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getParties", async(req, res) => {
    try {
        const result = await Non_Gl_Parties.findAll({
            attributes:['id', 'name' , 'person1', 'mobile1', 'person2', 'mobile2', 'telephone1', 'telephone2', 'address1', 'address2', 'createdBy', 'code'],
            order: [['createdAt', 'DESC'], /* ['name', 'ASC'],*/] 
        });
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/getPartiesById", async(req, res) => {
    try {
        const result = await Non_Gl_Parties.findOne({where:{id:req.headers.id}});
        res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.post("/editNonGlParty", async(req, res) => {


    try {
        let value = req.body;
        value.id = value.id
        value.operations = value.operations.join(', ');
        value.types = value.types.join(', ');
        const result = await Non_Gl_Parties.update({...value, code: parseInt(value.code)},{where:{id:value.id}}).then((x)=>console.log(x))
       
        res.json({status:'success', result:result})
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

module.exports = routes;
