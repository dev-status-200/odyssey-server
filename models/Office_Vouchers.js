module.exports = ( sequelize, DataTypes ) => {
    const Office_Vouchers = sequelize.define("Office_Vouchers", {
        requestedBy:{ type:DataTypes.STRING },
        onAcOf:     { type:DataTypes.TEXT   },
        amount:     { type:DataTypes.STRING },
        descriptive:{ type:DataTypes.BOOLEAN },
        preparedBy: { type:DataTypes.STRING },
        approved: { type:DataTypes.BOOLEAN },
        CompanyId: { type:DataTypes.BOOLEAN }
    })
    return Office_Vouchers
}