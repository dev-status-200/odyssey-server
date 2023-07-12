const express = require("express");
const app = express();

const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');

const db = require("./models");

const employeeRoutes = require('./routes/employees/');
const companyRoutes = require('./routes/companies/');
const accountRoutes = require('./routes/accounts/');
const clientRoutes = require('./routes/clients/');
const authRoutes = require('./routes/auth/');
const historyRoutes = require('./routes/history/');
const commodityRoutes = require('./routes/commodity/');
const vesselRoutes = require('./routes/vessel');
const vendorRoutes = require('./routes/vendors');
const seaJobRoutes = require('./routes/jobRoutes/sea');
const chargesRoutes = require('./routes/charges');
const invoiceRoutes = require('./routes/invoice');
const voucherRoutes = require('./routes/voucher');
const homeAccountRoutes = require('./routes/home/accounts');
const homeOperationsRoutes = require('./routes/home/operations');
const miscPartiesRoutes = require('./routes/misc/parties');
const miscProfitLossRoutes = require('./routes/misc/profitLoss');
const notificationRoutes = require('./routes/notifications');
const assignedTasks = require('./routes/assignTasks');

const { SE_Equipments, SE_Job, Container_Info, Bl, Stamps, Job_notes } = require('./functions/Associations/jobAssociations/seaExport');
const { Vendors, Vendor_Associations } = require('./functions/Associations/vendorAssociations');
const {Clients, Client_Associations} = require('./functions/Associations/clientAssociation');
const {Vouchers, Voucher_Heads} = require('./functions/Associations/voucherAssociations');
const { Voyage } = require('./functions/Associations/vesselAssociations');
const { AssignTask } = require('./functions/Associations/taskAssociation');
const { Notifications } = require('./functions/Associations/NotificationAssociation');

// const {Bl, Stamps} = require("./functions/Associations/stamps")

app.use(morgan('tiny'));
app.use(cors()); 

app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(bodyParser.json({limit: '100mb', extended: true}));
app.use(express.json());
db.sequelize.sync();

app.get("/", (req, res) => { res.json('Welcome to Sea Net System Server') });
//app.get("/getUser", verify, (req, res) => {res.json({isLoggedIn:true,username:req.body.username})});
app.use("/home", homeAccountRoutes, homeOperationsRoutes);
app.use("/employeeRoutes", employeeRoutes);
app.use("/clientRoutes", clientRoutes);
app.use("/commodity", commodityRoutes);
app.use("/companies", companyRoutes);
app.use("/accounts", accountRoutes);
app.use("/authRoutes", authRoutes);
app.use("/history", historyRoutes);
app.use("/charges", chargesRoutes);
app.use("/invoice", invoiceRoutes);
app.use("/vessel", vesselRoutes);
app.use("/vendor", vendorRoutes);
app.use("/seaJob", seaJobRoutes);
app.use("/voucher", voucherRoutes);
app.use("/notifications", notificationRoutes);
app.use("/misc", miscPartiesRoutes, miscProfitLossRoutes);
app.use("/tasks", assignedTasks);

// abdullah added a new feature
const PORT = process.env.PORT || 8081; 

app.listen(PORT, () => { console.log(`App listenings on port ${PORT}`) })

module.exports = app