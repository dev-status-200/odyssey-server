const { AssignTask } = require("../../models");
const routes = require('express').Router();
const Sequelize = require('sequelize');

routes.post('/allTasks', async (req, res) =>{
try {
    const result = await AssignTask.create(req.body)
    res.json({result: result})
} catch (error) {
    
}
})


module.exports = routes