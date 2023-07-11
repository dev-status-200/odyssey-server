module.exports = (sequelize, DataTypes) => {
    const Voucher_Heads = sequelize.define("Voucher_Heads", {
        defaultAmount:{
            type:DataTypes.STRING
        },
        amount:{
            type:DataTypes.STRING,
            allowNull: false,
            validate:{
                notEmpty: true
            }
        },
        type:{
            type:DataTypes.STRING,
            allowNull: false,
            validate:{
                notEmpty: true
            }
        },
        narration:{
            type:DataTypes.STRING,
            allowNull: false,
            validate:{
                notEmpty: true
            }
        },
        settlement:{
            type:DataTypes.STRING
        },
    })
    return Voucher_Heads;
}