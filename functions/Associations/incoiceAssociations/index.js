const { DataTypes } = require('sequelize')
const { Invoice, Charge_Head, Vouchers, Invoice_Losses } = require("../../../models");
//const { SE_Job, SE_Equipments } = require("../../functions/Associations/jobAssociations/seaExport");
const { SE_Job } = require("../jobAssociations/seaExport")

Invoice.hasMany(Charge_Head, {
    foriegnKey:{
        type: DataTypes.UUID,
        allowNull:false
    }
});
Charge_Head.belongsTo(Invoice);

Invoice.hasMany(Invoice_Losses, {
    foriegnKey:{
        type: DataTypes.UUID,
        allowNull:false
    }
});
Invoice_Losses.belongsTo(Invoice);

SE_Job.hasMany(Invoice, {
    foriegnKey:{
        type: DataTypes.UUID,
        allowNull:false
    }
});
Invoice.belongsTo(SE_Job);

SE_Job.hasMany(Charge_Head, {
    foriegnKey:{
        type: DataTypes.UUID,
        allowNull:false
    }
});
Charge_Head.belongsTo(SE_Job);

module.exports = { Charge_Head, Invoice, Vouchers, Invoice_Losses }