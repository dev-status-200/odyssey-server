module.exports = (sequelize, DataTypes) => {
    const Vouchers = sequelize.define("Vouchers", {
        voucher_No:{
            type:DataTypes.STRING,
            allowNull: false,
            validate:{
                notEmpty: true
            }
        },
        voucher_Id:{
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
        vType:{
            type:DataTypes.STRING,
            allowNull: false,
            validate:{
                notEmpty: true
            }
        },
        currency:{
            type:DataTypes.STRING,
        },
        exRate:{
            type:DataTypes.STRING,
        },
        settleExRate:{
            type:DataTypes.STRING,
        },
        chequeNo:{
            type:DataTypes.STRING,
        },
        chequeDate:{
            type:DataTypes.STRING,
        },
        payTo:{
            type:DataTypes.STRING,
        },
        costCenter:{
            type:DataTypes.STRING,
        },
        invoice_Voucher:{
            type:DataTypes.STRING,
        },
        invoice_Id:{
            type:DataTypes.STRING,
        },
    })
    return Vouchers;
}