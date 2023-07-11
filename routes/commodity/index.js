const { Op } = require("sequelize");
const routes = require('express').Router();
const { Commodity } = require("../../models");

routes.post("/create", async(req, res) => {
    let tempData = {...req.body.data};
    delete tempData.isHazmat;
    tempData.isHazmat = req.body.data.isHazmat.length>0?1:0;
    try {
      const exists = await Commodity.findOne({
        where:{hs:req.body.data.hs}
      });
      if(exists){
          res.json({status:'exists'});
      } else {
          const result = await Commodity.create(tempData);
          res.json({status:'success', result:result});
      }
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.get("/get", async(req, res) => {
    try {
      const result = await Commodity.findAll({
        order: [['createdAt', 'DESC']]
      });
      res.json({status:'success', result:result});
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

routes.post("/edit", async(req, res) => {
    let tempData = {...req.body.data};
    delete tempData.isHazmat;
    tempData.isHazmat = req.body.data.isHazmat.length>0?1:0;
    try {
      const exists = await Commodity.findOne({
        where:{
            id:{ [Op.ne]: tempData.id },
            hs:{ [Op.eq]: tempData.hs}
        }
      });
      if(exists){
          res.json({status:'exists', result:exists});
      } else {
          await Commodity.update(tempData,{
            where:{id:tempData.id}
          });
          const result = await Commodity.findOne({where:{id:tempData.id}})
          res.json({status:'success', result:result});
      }
    }
    catch (error) {
      res.json({status:'error', result:error});
    }
});

module.exports = routes;