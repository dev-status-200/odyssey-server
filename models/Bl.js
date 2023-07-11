module.exports = (sequelize, DataTypes) => {
    const Bl = sequelize.define("Bl", {
        hbl:{ type:DataTypes.STRING },
        no:{ type:DataTypes.INTEGER },
        hblDate:{ type:DataTypes.STRING },
        hblIssue:{ type:DataTypes.STRING },
        mbl:{ type:DataTypes.STRING },
        mblDate:{ type:DataTypes.STRING },
        status:{ type:DataTypes.STRING },
        blReleaseStatus:{ type:DataTypes.STRING },
        blhandoverType:{ type:DataTypes.STRING },
        releaseInstruction:{ type:DataTypes.STRING },
        remarks:{ type:DataTypes.STRING },
        sailingDate:{ type:DataTypes.STRING },
        shipDate:{ type:DataTypes.STRING },
        shipperContent:       { type:DataTypes.TEXT('long') },
        consigneeContent:     { type:DataTypes.TEXT('long') },
        notifyOneContent:     { type:DataTypes.TEXT('long') },
        notifyTwoContent:     { type:DataTypes.TEXT('long') },
        deliveryContent:      { type:DataTypes.TEXT('long') },
        marksContent:         { type:DataTypes.TEXT('long') },
        marksContentTwo:      { type:DataTypes.TEXT('long') },
        noOfPckgs:            { type:DataTypes.TEXT('long') },
        descOfGoodsContent:   { type:DataTypes.TEXT('long') },
        descOfGoodsContentTwo:{ type:DataTypes.TEXT('long') },
        grossWeightContent:   { type:DataTypes.TEXT('long') },
        measurementContent:   { type:DataTypes.TEXT('long') },
        AgentStamp:{ type:DataTypes.STRING },
        hs:{ type:DataTypes.STRING },
        onBoardDate:{ type:DataTypes.STRING },
        issuePlace:{ type:DataTypes.STRING },
        issueDate:{ type:DataTypes.STRING },
        poDeliveryTwo:{ type:DataTypes.STRING },
        podTwo:{ type:DataTypes.STRING },
        polTwo:{ type:DataTypes.STRING },
        agentM3:{ type:DataTypes.STRING },
        coloadM3:{ type:DataTypes.STRING },
        noBls:{ type:DataTypes.STRING },
        formE:{ type:DataTypes.STRING },
        formEDate:{ type:DataTypes.STRING },
    })
    return Bl;
}