-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: pms_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` varchar(50) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `old_values` text DEFAULT NULL,
  `new_values` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `branch_id` varchar(50) DEFAULT NULL,
  `severity` enum('INFO','WARNING','CRITICAL') DEFAULT 'INFO',
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `idx_audit_timestamp` (`timestamp`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_timestamp_new` (`timestamp`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_inventory`
--

DROP TABLE IF EXISTS `branch_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branch_inventory` (
  `branch_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `custom_price` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`branch_id`,`product_id`),
  KEY `product_id` (`product_id`),
  KEY `idx_inventory_branch` (`branch_id`),
  CONSTRAINT `branch_inventory_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `branch_inventory_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_inventory`
--

LOCK TABLES `branch_inventory` WRITE;
/*!40000 ALTER TABLE `branch_inventory` DISABLE KEYS */;
INSERT INTO `branch_inventory` VALUES ('BR002','P-1767000895682-0-5j37p',799,0.00),('BR002','P-1767000895682-1-wzpx0',0,0.00),('BR002','P-1767000895682-2-92vjp',0,NULL),('BR002','P-1767000895682-3-hnawl',7997,0.00),('BR003','P-1767000895682-0-5j37p',3186,NULL),('BR003','P-1767000895682-1-wzpx0',1920,NULL),('BR003','P-1767000895682-2-92vjp',249,NULL),('BR003','P-1767000895682-3-hnawl',1157,NULL),('BR003','P-1767000895682-4-yrm2o',7580,NULL),('BR003','P-1767000895682-5-s3q94',23092,NULL);
/*!40000 ALTER TABLE `branch_inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branches` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `location` text DEFAULT NULL,
  `manager_id` varchar(50) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_head_office` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES ('BR002','MALENYA SAYUNI MEDICS','MPANDA-KATAVI','ADMIN-001','ACTIVE','2025-12-18 17:29:39',0),('BR003','MALENYA KINGDOM PHARMACY WHOLESALE MPANDA','MPANDA-KATAVI','ADMIN-001','ACTIVE','2025-12-17 17:47:33',1),('BR004','MALENYA UKOMBOZI PHARMACY','SINGIDA','ADMIN-001','ACTIVE','2025-12-18 17:32:00',0),('BR005','MALENYA MAJIMOTO PHARMACY WHOLESALE ','MAJIMOTO, MPIMBWE','ADMIN-001','ACTIVE','2025-12-19 14:49:21',0),('BR006','MALENYA UKOMBOZI PHARMACY','UKOMBOZI, SINGIDA','ADMIN-001','ACTIVE','2025-12-23 05:47:58',0),('BR007','MALENYA KINGDOM PHARMACY RETAILS','MPANDA, KATAVI','ADMIN-001','ACTIVE','2025-12-23 06:01:24',0),('HEAD_OFFICE','Head Office (Global View)','HQ',NULL,'ACTIVE','2025-12-16 12:44:38',0);
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `drug_batches`
--

DROP TABLE IF EXISTS `drug_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `drug_batches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(50) DEFAULT NULL,
  `product_id` varchar(50) DEFAULT NULL,
  `batch_number` varchar(100) NOT NULL,
  `expiry_date` date NOT NULL,
  `quantity` int(11) NOT NULL,
  `status` enum('ACTIVE','EXPIRED','REJECTED','IN_TRANSIT') DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `idx_batches_branch_product` (`branch_id`,`product_id`),
  CONSTRAINT `drug_batches_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `drug_batches_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `drug_batches`
--

LOCK TABLES `drug_batches` WRITE;
/*!40000 ALTER TABLE `drug_batches` DISABLE KEYS */;
INSERT INTO `drug_batches` VALUES (72,'BR003','P-1767000895682-0-5j37p','3009','2025-12-29',0,'ACTIVE','2025-12-29 09:35:12'),(73,'BR003','P-1767000895682-1-wzpx0','1000','2025-12-29',2000,'ACTIVE','2025-12-29 09:35:31'),(74,'BR002','P-1767000895682-2-92vjp','345465','2025-12-29',0,'ACTIVE','2025-12-29 09:40:09'),(75,'BR003','P-1767000895682-0-5j37p','29992','2026-04-30',186,'ACTIVE','2025-12-29 17:15:48'),(76,'BR002','P-1767000895682-2-92vjp','232323','2025-12-31',0,'ACTIVE','2025-12-31 09:47:31'),(77,'BR003','P-1767000895682-2-92vjp','765','2025-12-31',2249,'ACTIVE','2025-12-31 14:02:13'),(78,'BR003','P-1767000895682-3-hnawl','56','2025-12-31',11157,'ACTIVE','2025-12-31 14:02:25'),(79,'BR003','P-1767000895682-4-yrm2o','4545','2025-12-31',7580,'ACTIVE','2025-12-31 14:02:37'),(80,'BR003','P-1767000895682-5-s3q94','768','2025-12-31',23092,'ACTIVE','2025-12-31 14:02:53'),(81,'BR002','P-1767000895682-3-hnawl','BATCH-1767220556167','2025-12-31',7997,'ACTIVE','2025-12-31 22:38:25'),(82,'BR003','P-1767000895682-0-5j37p','400745','2026-12-31',5000,'ACTIVE','2025-12-31 22:46:32'),(83,'BR002','P-1767000895682-0-5j37p','BATCH-1767221241355-j37p','2026-12-31',799,'ACTIVE','2025-12-31 22:50:21');
/*!40000 ALTER TABLE `drug_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `expenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `date` date NOT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `branch_id` varchar(50) DEFAULT NULL,
  `archived` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_expenses_branch` (`branch_id`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
INSERT INTO `expenses` VALUES (5,'Utilities','ljkhgf',6547676.00,'2025-12-29','Approved','BR002',0,'2025-12-29 09:43:06'),(6,'Utilities','sdfg',3333.00,'2025-12-31','Approved','BR002',0,'2025-12-31 10:36:57'),(7,'Utilities','xjhgf',1655454.00,'2025-12-31','Approved','BR002',0,'2025-12-31 10:39:10'),(8,'Maintenance','ujenzi',4000.00,'2026-01-01','Approved','BR002',0,'2025-12-31 22:34:25'),(9,'Utilities','6ghjgj',199988.00,'2025-12-31','Approved','BR002',0,'2025-12-31 23:41:12');
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_adjustments`
--

DROP TABLE IF EXISTS `inventory_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_adjustments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(50) DEFAULT NULL,
  `product_id` varchar(50) DEFAULT NULL,
  `adjustment` int(11) NOT NULL,
  `reason` text DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `product_id` (`product_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `inventory_adjustments_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `inventory_adjustments_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `inventory_adjustments_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `staff` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_adjustments`
--

LOCK TABLES `inventory_adjustments` WRITE;
/*!40000 ALTER TABLE `inventory_adjustments` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_payments`
--

DROP TABLE IF EXISTS `invoice_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoice_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_id` varchar(50) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` varchar(50) DEFAULT NULL,
  `receipt_number` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `invoice_id` (`invoice_id`),
  CONSTRAINT `invoice_payments_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_payments`
--

LOCK TABLES `invoice_payments` WRITE;
/*!40000 ALTER TABLE `invoice_payments` DISABLE KEYS */;
INSERT INTO `invoice_payments` VALUES (22,'INV-1767001273203-in2cxsbj1',2206600.00,'CASH','TRA-342382-955','2025-12-29 09:42:25'),(23,'INV-1767177367992-e6jrdbdz8',550.00,'CASH','TRA-402378-316','2025-12-31 10:36:44'),(24,'INV-1767177496817-vwf87ddmz',1648900.00,'CASH','TRA-503604-504','2025-12-31 10:38:26'),(25,'INV-1767184574408-1gam5fukf',55.00,'CASH','TRA-586184-420','2025-12-31 12:36:28'),(26,'INV-1767186693432-dp1841et9',55.00,'CASH','TRA-721516-824','2025-12-31 13:12:03'),(27,'INV-1767187267416-iupz04uqr',55.00,'CASH','TRA-276626-804','2025-12-31 13:21:18'),(28,'INV-1767193014687-ckflzlor3',66.00,'CASH','TRA-023914-647','2025-12-31 14:57:05'),(29,'INV-1767189827455-r1f6srkw3',2574.00,'CASH','TRA-467397-812','2025-12-31 15:04:29'),(30,'INV-1767195827402-uhr98ve2w',52343.00,'CASH','TRA-854082-648','2025-12-31 15:44:16'),(31,'INV-1767197388698-i8elbrgsy',39119.00,'CASH','TRA-422491-554','2025-12-31 16:10:26'),(32,'INV-1767198450525-oi92u1ry3',613556.00,'CASH','TRA-463081-426','2025-12-31 16:27:47'),(33,'INV-MP-2025-86480',605014.00,'CASH','TRA-602821-699','2025-12-31 16:46:44'),(34,'INV-MP-2025-68535',564.00,'CASH','TRA-323289-741','2025-12-31 16:59:10'),(35,'INV-MP-2025-68535',56.40,'CASH','TRA-364319-781','2025-12-31 16:59:36'),(36,'INV-MP-2025-29406',9108.00,'CASH','TRA-382900-438','2025-12-31 16:59:49'),(37,'INV-MP-2025-99917',619.00,'CASH','TRA-926994-276','2025-12-31 20:28:49'),(38,'INV-MP-2025-26710',8.00,'CASH','TRA-216506-846','2025-12-31 20:33:38'),(39,'INV-MP-2025-05051',561.00,'CASH','TRA-278511-190','2025-12-31 20:34:46'),(40,'INV-MP-2025-19070',4170.00,'CASH','TRA-146343-733','2025-12-31 20:49:08'),(41,'INV-MP-2026-43942',612.00,'CASH','TRA-111297-764','2025-12-31 22:28:34'),(42,'INV-MP-2026-51237',55063.00,'CASH','TRA-724837-182','2025-12-31 22:55:30'),(43,'INV-MP-2026-30341',8.00,'CASH','TRA-266495-214','2025-12-31 23:21:08'),(44,'INV-MP-2026-72190',8.00,'CASH','TRA-904995-108','2025-12-31 23:31:48'),(45,'INV-MP-2026-59652',13421.00,'CASH','TRA-439752-723','2025-12-31 23:40:48'),(46,'INV-MP-2026-39263',5500.00,'CASH','TRA-693985-219','2025-12-31 23:44:56'),(47,'INV-MP-2026-28194',13500.00,'CASH','TRA-828641-792','2025-12-31 23:47:10'),(48,'INV-MP-2026-09789',8000.00,'CASH','TRA-930005-560','2025-12-31 23:48:58');
/*!40000 ALTER TABLE `invoice_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoices` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `paid_amount` decimal(10,2) DEFAULT 0.00,
  `status` enum('PAID','PARTIAL','UNPAID') DEFAULT 'UNPAID',
  `due_date` date DEFAULT NULL,
  `description` text DEFAULT NULL,
  `source` varchar(50) DEFAULT 'MANUAL',
  `items` text DEFAULT NULL,
  `archived` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_invoices_branch` (`branch_id`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES ('INV-1767001273203-in2cxsbj1','BR002','jhgfh',2206600.00,2206600.00,'PAID','2026-01-28','Invoice from POS','POS','[{\"id\":\"P-1767000895682-2-92vjp\",\"name\":\"ACECLOFENAC TABS\",\"quantity\":3400,\"price\":550,\"costPrice\":490,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-29 09:41:13'),('INV-1767177367992-e6jrdbdz8','BR002','ddd',550.00,550.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-2-92vjp\",\"name\":\"ACECLOFENAC TABS\",\"quantity\":1,\"price\":550,\"costPrice\":490,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 10:36:08'),('INV-1767177496817-vwf87ddmz','BR002','sdj',1648900.00,1648900.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-2-92vjp\",\"name\":\"ACECLOFENAC TABS\",\"quantity\":2998,\"price\":550,\"costPrice\":490,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 10:38:16'),('INV-1767184574408-1gam5fukf','BR003','ER',55.00,55.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":1,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 12:36:14'),('INV-1767186693432-dp1841et9','BR003','er',55.00,55.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":1,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 13:11:33'),('INV-1767187267416-iupz04uqr','BR003','er',55.00,55.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":1,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 13:21:07'),('INV-1767189827455-r1f6srkw3','BR003','vanadizy, 12345',2574.00,2574.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":1,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":178,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-5-s3q94\",\"name\":\"ACTINAC PLUS TABLET\",\"quantity\":189,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-4-yrm2o\",\"name\":\"ACRASON CREAM TUBE\",\"quantity\":176,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 14:03:47'),('INV-1767193014687-ckflzlor3','BR003','dopa',66.00,66.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-4-yrm2o\",\"name\":\"ACRASON CREAM TUBE\",\"quantity\":1,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":1,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 14:56:54'),('INV-1767195827402-uhr98ve2w','BR003','johnson',52343.00,52343.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":1,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-2-92vjp\",\"name\":\"ACECLOFENAC TABS\",\"quantity\":95,\"price\":550,\"costPrice\":490,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-5-s3q94\",\"name\":\"ACTINAC PLUS TABLET\",\"quantity\":10,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 15:43:47'),('INV-1767197388698-i8elbrgsy','BR003','hassan',39119.00,39119.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":701,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-2-92vjp\",\"name\":\"ACECLOFENAC TABS\",\"quantity\":1,\"price\":550,\"costPrice\":490,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-4-yrm2o\",\"name\":\"ACRASON CREAM TUBE\",\"quantity\":1,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-5-s3q94\",\"name\":\"ACTINAC PLUS TABLET\",\"quantity\":1,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 16:09:48'),('INV-1767198450525-oi92u1ry3','BR003','hamad',613556.00,613556.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":1000,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-2-92vjp\",\"name\":\"ACECLOFENAC TABS\",\"quantity\":1001,\"price\":550,\"costPrice\":490,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1000,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-5-s3q94\",\"name\":\"ACTINAC PLUS TABLET\",\"quantity\":1,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-4-yrm2o\",\"name\":\"ACRASON CREAM TUBE\",\"quantity\":1,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 16:27:30'),('INV-MP-2025-05051','BR003','hang out',561.00,561.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-2-92vjp\",\"name\":\"ACECLOFENAC TABS\",\"quantity\":1,\"price\":550,\"costPrice\":490,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-4-yrm2o\",\"name\":\"ACRASON CREAM TUBE\",\"quantity\":1,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 20:34:26'),('INV-MP-2025-19070','BR003','munishi',4170.00,4170.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-2-92vjp\",\"name\":\"ACECLOFENAC TABS\",\"quantity\":7,\"price\":550,\"costPrice\":490,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":5,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":3,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-4-yrm2o\",\"name\":\"ACRASON CREAM TUBE\",\"quantity\":3,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-5-s3q94\",\"name\":\"ACTINAC PLUS TABLET\",\"quantity\":4,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 20:48:50'),('INV-MP-2025-26710','BR003','new',8.00,8.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 17:48:09'),('INV-MP-2025-29406','BR003','madam',9108.00,9108.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":101,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-4-yrm2o\",\"name\":\"ACRASON CREAM TUBE\",\"quantity\":1000,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-5-s3q94\",\"name\":\"ACTINAC PLUS TABLET\",\"quantity\":1,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-2-92vjp\",\"name\":\"ACECLOFENAC TABS\",\"quantity\":1,\"price\":550,\"costPrice\":490,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 16:58:31'),('INV-MP-2025-68535','BR003','juma',564.00,620.40,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-2-92vjp\",\"name\":\"ACECLOFENAC TABS\",\"quantity\":1,\"price\":550,\"costPrice\":490,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-4-yrm2o\",\"name\":\"ACRASON CREAM TUBE\",\"quantity\":1,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-5-s3q94\",\"name\":\"ACTINAC PLUS TABLET\",\"quantity\":1,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 16:49:41'),('INV-MP-2025-86480','BR003','mussa',605014.00,605014.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":1000,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-2-92vjp\",\"name\":\"ACECLOFENAC TABS\",\"quantity\":1000,\"price\":550,\"costPrice\":490,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-4-yrm2o\",\"name\":\"ACRASON CREAM TUBE\",\"quantity\":1,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-5-s3q94\",\"name\":\"ACTINAC PLUS TABLET\",\"quantity\":1,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 16:46:16'),('INV-MP-2025-99917','BR003','weed master',619.00,619.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-2-92vjp\",\"name\":\"ACECLOFENAC TABS\",\"quantity\":1,\"price\":550,\"costPrice\":490,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-4-yrm2o\",\"name\":\"ACRASON CREAM TUBE\",\"quantity\":1,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-5-s3q94\",\"name\":\"ACTINAC PLUS TABLET\",\"quantity\":1,\"price\":3,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":1,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 20:28:35'),('INV-MP-2026-09789','BR002','kaka yao',8000.00,8000.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1000,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 23:48:40'),('INV-MP-2026-28194','BR002','never',13500.00,13500.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":100,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1000,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 23:46:35'),('INV-MP-2026-30341','BR002','james',8.00,8.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 23:20:22'),('INV-MP-2026-39263','BR002','neema',5500.00,5500.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":100,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 23:44:35'),('INV-MP-2026-43942','BR002','kache john',612.00,612.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-2-92vjp\",\"name\":\"ACECLOFENAC TABS\",\"quantity\":1,\"price\":550,\"costPrice\":490,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-1-wzpx0\",\"name\":\"ABITOL TABS 4MG\",\"quantity\":1,\"price\":7,\"costPrice\":2,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":1,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 22:28:10'),('INV-MP-2026-51237','BR002','asuman',55063.00,55063.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":1001,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 22:55:06'),('INV-MP-2026-59652','BR002','EMMANIEL',13421.00,13421.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":997,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"},{\"id\":\"P-1767000895682-0-5j37p\",\"name\":\"ABDOMINAL BELT XXL\",\"quantity\":99,\"price\":55,\"costPrice\":22,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 23:39:13'),('INV-MP-2026-72190','BR002','sosoma',8.00,8.00,'PAID','2026-01-30','Invoice from POS','POS','[{\"id\":\"P-1767000895682-3-hnawl\",\"name\":\"ACNE FREE TUBE\",\"quantity\":1,\"price\":8,\"costPrice\":6,\"selectedBatch\":\"BATCH-AUTO\"}]',0,'2025-12-31 23:31:32');
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patients`
--

DROP TABLE IF EXISTS `patients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `patients` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `age` int(11) DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `emergency_contact` varchar(255) DEFAULT NULL,
  `emergency_phone` varchar(20) DEFAULT NULL,
  `allergies` text DEFAULT NULL,
  `medical_conditions` text DEFAULT NULL,
  `current_medications` text DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_visit` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_patients_branch` (`branch_id`),
  KEY `idx_patients_phone` (`phone`),
  KEY `idx_patients_name` (`name`),
  CONSTRAINT `patients_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `patients_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `staff` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patients`
--

LOCK TABLES `patients` WRITE;
/*!40000 ALTER TABLE `patients` DISABLE KEYS */;
/*!40000 ALTER TABLE `patients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prescription_items`
--

DROP TABLE IF EXISTS `prescription_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `prescription_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `prescription_id` varchar(50) DEFAULT NULL,
  `medication_name` varchar(255) NOT NULL,
  `generic_name` varchar(255) DEFAULT NULL,
  `dosage` varchar(100) DEFAULT NULL,
  `frequency` varchar(100) DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `instructions` text DEFAULT NULL,
  `quantity_prescribed` int(11) DEFAULT NULL,
  `quantity_dispensed` int(11) DEFAULT 0,
  `product_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_prescription_items_prescription` (`prescription_id`),
  KEY `idx_prescription_items_product` (`product_id`),
  CONSTRAINT `prescription_items_ibfk_1` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`),
  CONSTRAINT `prescription_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prescription_items`
--

LOCK TABLES `prescription_items` WRITE;
/*!40000 ALTER TABLE `prescription_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `prescription_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prescriptions`
--

DROP TABLE IF EXISTS `prescriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `prescriptions` (
  `id` varchar(50) NOT NULL,
  `patient_id` varchar(50) DEFAULT NULL,
  `doctor_name` varchar(255) DEFAULT NULL,
  `diagnosis` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('ACTIVE','COMPLETED','CANCELLED') DEFAULT 'ACTIVE',
  `branch_id` varchar(50) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_prescriptions_patient` (`patient_id`),
  KEY `idx_prescriptions_branch` (`branch_id`),
  CONSTRAINT `prescriptions_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`),
  CONSTRAINT `prescriptions_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `prescriptions_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `staff` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prescriptions`
--

LOCK TABLES `prescriptions` WRITE;
/*!40000 ALTER TABLE `prescriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `prescriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_releases`
--

DROP TABLE IF EXISTS `product_releases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_releases` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `batch_number` varchar(100) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  `created_by` varchar(50) DEFAULT NULL,
  `approved_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `approved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `product_id` (`product_id`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `product_releases_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `product_releases_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `product_releases_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `staff` (`id`),
  CONSTRAINT `product_releases_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `staff` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_releases`
--

LOCK TABLES `product_releases` WRITE;
/*!40000 ALTER TABLE `product_releases` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_releases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `generic_name` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `cost_price` decimal(10,2) NOT NULL,
  `base_price` decimal(10,2) NOT NULL,
  `unit` varchar(50) DEFAULT 'Strip',
  `min_stock_level` int(11) DEFAULT 10,
  `requires_prescription` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES ('P-1767000895682-0-5j37p','ABDOMINAL BELT XXL','ABDOMINAL BELT XXL','General',22.00,55.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895682-1-wzpx0','ABITOL TABS 4MG','ABITOL TABS 4MG','General',2.00,7.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-10-33n1u','ADRENALINE INJ','ADRENALINE INJ','General',1.00,1.00,'Box',60,0,'2025-12-29 09:34:55'),('P-1767000895682-100-ke001','CARVEDILOL 12.5MG','CARVEDILOL 12.5MG','General',3.00,4.00,'Box',172,0,'2025-12-29 09:34:55'),('P-1767000895682-101-telhp','CARVEDILOL 6.25MG','CARVEDILOL 6.25MG','General',3.00,3.00,'Box',161,0,'2025-12-29 09:34:55'),('P-1767000895682-102-lsssc','CASTOR OIL BOTTLE','CASTOR OIL BOTTLE','General',2.00,3.00,'Box',9,0,'2025-12-29 09:34:55'),('P-1767000895682-103-3ahnv','CATHY SANITARY PADS','CATHY SANITARY PADS','General',3.00,4.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-104-gk9b5','CEFADROXIL CAPS 500MG 10\'S','CEFADROXIL CAPS 500MG 10\'S','General',3.00,3.00,'Box',80,0,'2025-12-29 09:34:55'),('P-1767000895682-105-lpuqu','CEFIXIME 200MG TAB','CEFIXIME 200MG TAB','General',3.00,3.00,'Box',494,0,'2025-12-29 09:34:55'),('P-1767000895682-106-1nxu6','CEFIXIME 400MG TAB','CEFIXIME 400MG TAB','General',6.00,8.00,'Box',4,0,'2025-12-29 09:34:55'),('P-1767000895682-107-l2bjn','CEFIXIME SYRUP','CEFIXIME SYRUP','General',2.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-108-y5vz8','CEFPODOXIME 200MG 10\'S','CEFPODOXIME 200MG 10\'S','General',8.00,9.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-109-adw4k','CEFTRIAXONE + SULBACTAM INJ','CEFTRIAXONE + SULBACTAM INJ','General',2.00,3.00,'Box',697,0,'2025-12-29 09:34:55'),('P-1767000895682-11-veqxb','ADULT DIAPERS','ADULT DIAPERS','General',944.14,1.00,'Box',306,0,'2025-12-29 09:34:55'),('P-1767000895682-110-lo3ip','CEFTRIAXONE INJ 1G','CEFTRIAXONE INJ 1G','General',680.32,1.00,'Box',201,0,'2025-12-29 09:34:55'),('P-1767000895682-111-htip2','CEFUROXIME 250MG 10\'S','CEFUROXIME 250MG 10\'S','General',7.00,9.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-112-4q03g','CELESTAMINE TABS','CELESTAMINE TABS','General',7.00,13.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-113-v0z30','CEPHALEXIN CAP 500MG','CEPHALEXIN CAP 500MG','General',14.00,16.00,'Box',29,0,'2025-12-29 09:34:55'),('P-1767000895682-114-drwj7','CEPHALEXIN CAPS 250MG','CEPHALEXIN CAPS 250MG','General',7.00,7.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895682-115-0u5a0','CEPHALEXIN SYRUP 100ML BOTTLE','CEPHALEXIN SYRUP 100ML BOTTLE','General',1.00,2.00,'Box',615,0,'2025-12-29 09:34:55'),('P-1767000895682-116-8968g','CERVICAL COLLAR','CERVICAL COLLAR','General',15.00,22.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-117-druc9','CETRIZINE SYRUP BOTTLE','CETRIZINE SYRUP BOTTLE','General',804.73,1.00,'Box',4,0,'2025-12-29 09:34:55'),('P-1767000895682-118-3iv3a','CETRIZINE TABS','CETRIZINE TABS','General',1.00,2.00,'Box',619,0,'2025-12-29 09:34:55'),('P-1767000895682-119-44kqu','CHESTCOF LOZENGES','CHESTCOF LOZENGES','General',6.00,8.00,'Box',68,0,'2025-12-29 09:34:55'),('P-1767000895682-12-owlho','ALBENDAZOLE SYRUP BOTTLE','ALBENDAZOLE SYRUP BOTTLE','General',550.00,700.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-120-knp47','CHESTCOF SYRUP BOTTLE','CHESTCOF SYRUP BOTTLE','General',1.00,2.00,'Box',285,0,'2025-12-29 09:34:55'),('P-1767000895682-121-eitzt','CHLORAMPHENICOL CAPS','CHLORAMPHENICOL CAPS','General',6.00,7.00,'Box',327,0,'2025-12-29 09:34:55'),('P-1767000895682-122-5e1kl','CHLORAMPHENICOL EYE DROP BOTTLE','CHLORAMPHENICOL EYE DROP BOTTLE','General',325.37,550.00,'Box',39,0,'2025-12-29 09:34:55'),('P-1767000895682-123-ts6f5','CHLORAMPHENICOL EYE OINT TUBE','CHLORAMPHENICOL EYE OINT TUBE','General',505.33,750.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895682-124-2s9hj','CHLORAMPHENICOL SYRUP 100ML','CHLORAMPHENICOL SYRUP 100ML','General',1.00,1.00,'Box',422,0,'2025-12-29 09:34:55'),('P-1767000895682-125-mevs4','CHROMC CUTGUT NO. 2/0  P12','CHROMC CUTGUT NO. 2/0  P12','General',11.00,18.00,'Box',20,0,'2025-12-29 09:34:55'),('P-1767000895682-126-dtvzd','CIFRAN CT-100','CIFRAN CT-100','General',3.00,4.00,'Box',255,0,'2025-12-29 09:34:55'),('P-1767000895682-127-75tgm','CIMETIDINE TAB 400MG','CIMETIDINE TAB 400MG','General',24.00,25.00,'Box',20,0,'2025-12-29 09:34:55'),('P-1767000895682-128-sf08a','CIPRO EYE/EAR DROP BOTTLE','CIPRO EYE/EAR DROP BOTTLE','General',400.00,1.00,'Box',22,0,'2025-12-29 09:34:55'),('P-1767000895682-129-dbt4o','CIPROFLOXACIN IV','CIPROFLOXACIN IV','General',750.00,900.00,'Box',110,0,'2025-12-29 09:34:55'),('P-1767000895682-13-60soy','ALBENDAZOLE TAB 2\'S PACKET (ALB','ALBENDAZOLE TAB 2\'S PACKET (ALB','General',269.65,310.00,'Box',23,0,'2025-12-29 09:34:55'),('P-1767000895682-130-ac595','CIPROFLOXACIN TAB','CIPROFLOXACIN TAB','General',4.00,6.00,'Box',39,0,'2025-12-29 09:34:55'),('P-1767000895682-131-c990m','CITAL SYRUP','CITAL SYRUP','General',5.00,7.00,'Box',140,0,'2025-12-29 09:34:55'),('P-1767000895682-132-lt5dd','CLARITHROMYCIN 20\'S TAB','CLARITHROMYCIN 20\'S TAB','General',14.00,18.00,'Box',46,0,'2025-12-29 09:34:55'),('P-1767000895682-133-kdtdi','CLEAV KIT','CLEAV KIT','General',6.00,30.00,'Box',77,0,'2025-12-29 09:34:55'),('P-1767000895682-134-3mrcj','CLEAV TABS 4\'S','CLEAV TABS 4\'S','General',2.00,3.00,'Box',64,0,'2025-12-29 09:34:55'),('P-1767000895682-135-rkppc','CLINDAMYCIN CAPS 150MG','CLINDAMYCIN CAPS 150MG','General',7.00,7.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-136-7y88k','CLINDAMYCIN GEL 1%','CLINDAMYCIN GEL 1%','General',1.00,2.00,'Box',64,0,'2025-12-29 09:34:55'),('P-1767000895682-137-0wbo8','CLOMIPHENE TAB','CLOMIPHENE TAB','General',2.00,3.00,'Box',127,0,'2025-12-29 09:34:55'),('P-1767000895682-138-axf7k','CLOPIDOGREL TAB','CLOPIDOGREL TAB','General',3.00,3.00,'Box',148,0,'2025-12-29 09:34:55'),('P-1767000895682-139-2jzbb','CLOTRILIN V CREAM','CLOTRILIN V CREAM','General',1.00,1.00,'Box',608,0,'2025-12-29 09:34:55'),('P-1767000895682-14-w8878','ALLOPURINOL TAB 300MG 100\'S','ALLOPURINOL TAB 300MG 100\'S','General',8.00,8.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-140-0wbqq','CLOTRIMAZOLE CREAM (OTHERS) PRI','CLOTRIMAZOLE CREAM (OTHERS) PRI','General',401.10,650.00,'Box',486,0,'2025-12-29 09:34:55'),('P-1767000895682-141-qa1g6','CLOTRIMAZOLE PESSARY 6s PACKET','CLOTRIMAZOLE PESSARY 6s PACKET','General',650.00,1.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895682-142-uxca2','COFFNIL HERBAL SYRUP','COFFNIL HERBAL SYRUP','General',1.00,1.00,'Box',347,0,'2025-12-29 09:34:55'),('P-1767000895682-143-642kj','COFTA LOZENGES','COFTA LOZENGES','General',6.00,7.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-144-foia2','COLD CAP SYRUP','COLD CAP SYRUP','General',2.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-145-sbbka','COLD OFF CAP','COLD OFF CAP','General',7.00,7.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-146-diifa','COLD OIL (SEVEN SEAS)','COLD OIL (SEVEN SEAS)','General',8.00,9.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-147-hew64','COLD VAN CAPS','COLD VAN CAPS','General',0.00,7.00,'Box',3,0,'2025-12-29 09:34:55'),('P-1767000895682-148-abjr6','COLDCAP 96\'S CAPS','COLDCAP 96\'S CAPS','General',12.00,14.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-149-62fmp','COLDRIL CAPS','COLDRIL CAPS','General',1.00,2.00,'Box',443,0,'2025-12-29 09:34:55'),('P-1767000895682-15-qkzij','ALTAPHAM SYRUP BOTTLE','ALTAPHAM SYRUP BOTTLE','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-150-l9f38','COLDRIL SYRUP BOTTLE','COLDRIL SYRUP BOTTLE','General',1.00,2.00,'Box',346,0,'2025-12-29 09:34:55'),('P-1767000895682-151-oe1qa','COLGATE  140G','COLGATE  140G','General',3.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-152-8lz13','COLGATE  70G','COLGATE  70G','General',1.00,2.00,'Box',61,0,'2025-12-29 09:34:55'),('P-1767000895682-153-t029l','COLGATE CHARCOAL 120G','COLGATE CHARCOAL 120G','General',4.00,4.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-154-8m4eo','COLGATE MAXFRESH 130G','COLGATE MAXFRESH 130G','General',3.00,4.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-155-g6e0l','COLGATE MAXFRESH 65G','COLGATE MAXFRESH 65G','General',2.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-156-v70q2','COLGATE MISWAKI','COLGATE MISWAKI','General',1.00,1.00,'Box',36,0,'2025-12-29 09:34:55'),('P-1767000895682-157-7bqwu','CONDOM BULL,KISS,LIFEGUARD','CONDOM BULL,KISS,LIFEGUARD','General',385.40,450.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895682-158-avd2e','CONDOM FIESTA','CONDOM FIESTA','General',535.52,750.00,'Box',30,0,'2025-12-29 09:34:55'),('P-1767000895682-159-4bgcp','CONDOM FLAME','CONDOM FLAME','General',780.00,980.00,'Box',14,0,'2025-12-29 09:34:55'),('P-1767000895682-16-3z3at','ALU CAT 1','ALU CAT 1','General',637.03,750.00,'Box',30,0,'2025-12-29 09:34:55'),('P-1767000895682-160-ub3yw','CONDOM REGULAR (DUME)','CONDOM REGULAR (DUME)','General',283.64,350.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-161-0dktf','COPHYDEX SYRUP BOTTLE','COPHYDEX SYRUP BOTTLE','General',1.00,1.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895682-162-6o0af','CORD CLAMP','CORD CLAMP','General',111.17,250.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895682-163-0bzer','COTTON WOOL 100G','COTTON WOOL 100G','General',895.51,1.00,'Box',620,0,'2025-12-29 09:34:55'),('P-1767000895682-164-cx0o0','COTTON WOOL 50G','COTTON WOOL 50G','General',505.00,700.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-165-39oxh','CREPE BANDAGE 10CM','CREPE BANDAGE 10CM','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-166-d0rxf','CREPE BANDAGE 15 CM','CREPE BANDAGE 15 CM','General',1.00,1.00,'Box',89,0,'2025-12-29 09:34:55'),('P-1767000895682-167-jlbqj','CREPE BANDAGE 5CM','CREPE BANDAGE 5CM','General',736.76,1.00,'Box',587,0,'2025-12-29 09:34:55'),('P-1767000895682-168-xvsxn','CREPE BANDAGE 7.5 CM','CREPE BANDAGE 7.5 CM','General',648.20,1.00,'Box',358,0,'2025-12-29 09:34:55'),('P-1767000895682-169-tmqt8','DAWA TATU TABS','DAWA TATU TABS','General',8.00,9.00,'Box',36,0,'2025-12-29 09:34:55'),('P-1767000895682-17-976j9','ALU CAT 2','ALU CAT 2','General',900.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-170-hyoij','DAWA YA MBA LOTION 100ML BOTTLE','DAWA YA MBA LOTION 100ML BOTTLE','General',550.00,750.00,'Box',29,0,'2025-12-29 09:34:55'),('P-1767000895682-171-cdiz8','DEEP HEAT SPRAY','DEEP HEAT SPRAY','General',13.00,17.00,'Box',54,0,'2025-12-29 09:34:55'),('P-1767000895682-172-qn8gg','DENTAMOL TAB','DENTAMOL TAB','General',1.00,2.00,'Box',4,0,'2025-12-29 09:34:55'),('P-1767000895682-173-127y8','DENTAWISS 125MLS','DENTAWISS 125MLS','General',3.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-174-s6g3x','DEPO PROVERA INJ','DEPO PROVERA INJ','General',1.00,1.00,'Box',185,0,'2025-12-29 09:34:55'),('P-1767000895682-175-tf4ye','DEPROFOS INJ.','DEPROFOS INJ.','General',18.00,22.00,'Box',12,0,'2025-12-29 09:34:55'),('P-1767000895682-176-uomx8','DERMAQUIT CREAM 15MG','DERMAQUIT CREAM 15MG','General',3.00,3.00,'Box',6,0,'2025-12-29 09:34:55'),('P-1767000895682-177-xyynu','DESLORATADINE TABS 30\'S','DESLORATADINE TABS 30\'S','General',5.00,8.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-178-k70mf','DETTOL BRND 60MLS','DETTOL BRND 60MLS','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-179-pc5f2','DETTOL SOAP','DETTOL SOAP','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-18-i9kmk','ALU CAT 4 PACKET','ALU CAT 4 PACKET','General',802.82,1.00,'Box',23,0,'2025-12-29 09:34:55'),('P-1767000895682-180-4dazk','DETTOL SOAP JUNIOR','DETTOL SOAP JUNIOR','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-181-39wba','DETTOL SOAP KUBWA','DETTOL SOAP KUBWA','General',2.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-182-ruxbd','DETTOL SOLN 125ML','DETTOL SOLN 125ML','General',3.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-183-xxdy5','DETTOL SOLN 50MLS','DETTOL SOLN 50MLS','General',1.00,1.00,'Box',12,0,'2025-12-29 09:34:55'),('P-1767000895682-184-uu358','DETTOL SOLUTION 100MLS BOTTLE','DETTOL SOLUTION 100MLS BOTTLE','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-185-oz54t','DETTTOL SOLN 500MLS','DETTTOL SOLN 500MLS','General',9.00,11.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-186-3b653','DEXA-CHLORO EYE DROP BOTTLE','DEXA-CHLORO EYE DROP BOTTLE','General',1.00,1.00,'Box',175,0,'2025-12-29 09:34:55'),('P-1767000895682-187-zebed','DEXA-GENTA EYE DROP','DEXA-GENTA EYE DROP','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-188-8jamj','DEXA-NEO EYE DROP BOTTLE','DEXA-NEO EYE DROP BOTTLE','General',769.46,950.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895682-189-xjv1e','DEXAMETHASONE EYE DROPS','DEXAMETHASONE EYE DROPS','General',700.00,1.00,'Box',960,0,'2025-12-29 09:34:55'),('P-1767000895682-19-wntar','ALU SYRUP 60ML BOTTLE','ALU SYRUP 60ML BOTTLE','General',2.00,3.00,'Box',220,0,'2025-12-29 09:34:55'),('P-1767000895682-190-ntthe','DEXAMETHASONE INJ','DEXAMETHASONE INJ','General',718.85,1.00,'Box',100,0,'2025-12-29 09:34:55'),('P-1767000895682-191-jkxye','DEXAMETHASONE TAB','DEXAMETHASONE TAB','General',9.00,10.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-192-wibqu','DEXTROSE 10%','DEXTROSE 10%','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-193-jn7qx','DEXTROSE 5%','DEXTROSE 5%','General',949.40,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-194-9rmpm','DEXTROSE+ NORMAL SALINE (DNS)','DEXTROSE+ NORMAL SALINE (DNS)','General',950.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-195-hne33','DIAZEPAM INJ','DIAZEPAM INJ','General',1.00,1.00,'Box',50,0,'2025-12-29 09:34:55'),('P-1767000895682-196-67b6f','DIAZEPAM TABS PKT','DIAZEPAM TABS PKT','General',2.00,3.00,'Box',27,0,'2025-12-29 09:34:55'),('P-1767000895682-2-92vjp','ACECLOFENAC TABS','ACECLOFENAC TABS','General',490.00,550.00,'Box',750,0,'2025-12-29 09:34:55'),('P-1767000895682-20-u3ejs','ALUGEL SYRUP BOTTLE','ALUGEL SYRUP BOTTLE','General',1.00,1.00,'Box',3,0,'2025-12-29 09:34:55'),('P-1767000895682-21-yu9ur','AMINOPHYLINE INJ','AMINOPHYLINE INJ','General',985.00,1.00,'Box',55,0,'2025-12-29 09:34:55'),('P-1767000895682-22-7ktb7','AMINOPHYLINE TAB PKT','AMINOPHYLINE TAB PKT','General',2.00,3.00,'Box',259,0,'2025-12-29 09:34:55'),('P-1767000895682-23-xqfcl','AMITRIPTYLINE TAB','AMITRIPTYLINE TAB','General',7.00,9.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895682-24-zptec','AMLODIPINE TAB 10MG','AMLODIPINE TAB 10MG','General',1.00,2.00,'Box',490,0,'2025-12-29 09:34:55'),('P-1767000895682-25-5chjl','AMLODIPINE TAB 5MG','AMLODIPINE TAB 5MG','General',1.00,1.00,'Box',366,0,'2025-12-29 09:34:55'),('P-1767000895682-26-pfxmx','AMOL G CREAM TUBE','AMOL G CREAM TUBE','General',2.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-27-qguxu','AMOX-CLAV SYRUP 228.5','AMOX-CLAV SYRUP 228.5','General',3.00,4.00,'Box',262,0,'2025-12-29 09:34:55'),('P-1767000895682-28-az7yc','AMOXCLAV TAB PACKET','AMOXCLAV TAB PACKET','General',3.00,4.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895682-29-wuxpc','AMOXLAV INJ','AMOXLAV INJ','General',3.00,3.00,'Box',408,0,'2025-12-29 09:34:55'),('P-1767000895682-3-hnawl','ACNE FREE TUBE','ACNE FREE TUBE','General',6.00,8.00,'Box',75,0,'2025-12-29 09:34:55'),('P-1767000895682-30-ufeb9','AMOXYLLIN CAP 250MG','AMOXYLLIN CAP 250MG','General',3.00,4.00,'Box',791,0,'2025-12-29 09:34:55'),('P-1767000895682-31-tfafd','AMOXYLLIN DT TABS','AMOXYLLIN DT TABS','General',5.00,7.00,'Box',126,0,'2025-12-29 09:34:55'),('P-1767000895682-32-up7a7','AMOXYLLINE SYRUP 100ML BOTTLE','AMOXYLLINE SYRUP 100ML BOTTLE','General',843.97,1.00,'Box',3,0,'2025-12-29 09:34:55'),('P-1767000895682-33-hr5l7','AMPICILLIN + SULBACTUM 375MG TA','AMPICILLIN + SULBACTUM 375MG TA','General',11.00,15.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-34-aeajp','AMPICILLIN CAPS 250MG','AMPICILLIN CAPS 250MG','General',6.00,7.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-35-41ibj','AMPICILLIN INJ 500MG VIAL','AMPICILLIN INJ 500MG VIAL','General',550.00,950.00,'Box',171,0,'2025-12-29 09:34:55'),('P-1767000895682-36-ilrdd','AMPICILLIN SYRUP 100ML BOTTLE','AMPICILLIN SYRUP 100ML BOTTLE','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-37-x3c5w','AMPICLOX CAPS 500MG','AMPICLOX CAPS 500MG','General',8.00,10.00,'Box',4,0,'2025-12-29 09:34:55'),('P-1767000895682-38-pz78s','AMPICLOX INJ 500MG VIAL','AMPICLOX INJ 500MG VIAL','General',650.00,850.00,'Box',515,0,'2025-12-29 09:34:55'),('P-1767000895682-39-sdeuy','AMPICLOX NEONATAL','AMPICLOX NEONATAL','General',2.00,3.00,'Box',54,0,'2025-12-29 09:34:55'),('P-1767000895682-4-yrm2o','ACRASON CREAM TUBE','ACRASON CREAM TUBE','General',2.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-40-ik4qm','AMPICLOX SYRUP 100ML BOTTLE','AMPICLOX SYRUP 100ML BOTTLE','General',1.00,1.00,'Box',296,0,'2025-12-29 09:34:55'),('P-1767000895682-41-2zcne','ANT-RABIES IMMUNOGLOBIN','ANT-RABIES IMMUNOGLOBIN','General',20.00,24.00,'Box',101,0,'2025-12-29 09:34:55'),('P-1767000895682-42-gn79u','ANTI-D IMMUNOGLOBULIN','ANTI-D IMMUNOGLOBULIN','General',121.00,170.00,'Box',3,0,'2025-12-29 09:34:55'),('P-1767000895682-43-q0svi','ANTIHISTAMINE CREAM TUBE','ANTIHISTAMINE CREAM TUBE','General',1.00,1.00,'Box',37,0,'2025-12-29 09:34:55'),('P-1767000895682-44-twjw8','ANUSOL OINTMENT TUBE','ANUSOL OINTMENT TUBE','General',7.00,13.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-45-veub4','ANUSOL SUPOSSITORY TABS','ANUSOL SUPOSSITORY TABS','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-46-qv4lf','APCALIS CT 20MG','APCALIS CT 20MG','General',2.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-47-ojk8w','APDYL- H HERBAL SYRUP','APDYL- H HERBAL SYRUP','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-48-fek9x','ARTEMETHER INJ 80MG','ARTEMETHER INJ 80MG','General',467.00,600.00,'Box',555,0,'2025-12-29 09:34:55'),('P-1767000895682-49-lqxc3','ARTEQUICK TAB 6s PACKET','ARTEQUICK TAB 6s PACKET','General',7.00,8.00,'Box',13,0,'2025-12-29 09:34:55'),('P-1767000895682-5-s3q94','ACTINAC PLUS TABLET','ACTINAC PLUS TABLET','General',2.00,3.00,'Box',225,0,'2025-12-29 09:34:55'),('P-1767000895682-50-y22te','ARTESUNATE INJ 30MG','ARTESUNATE INJ 30MG','General',2.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-51-92wiv','ARTESUNATE INJ. 60MG','ARTESUNATE INJ. 60MG','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-52-ro9mk','ASCARD TAB 75MG','ASCARD TAB 75MG','General',1.00,2.00,'Box',118,0,'2025-12-29 09:34:55'),('P-1767000895682-53-5qp6o','ASCORIL D SYRUP','ASCORIL D SYRUP','General',2.00,3.00,'Box',45,0,'2025-12-29 09:34:55'),('P-1767000895682-54-wrv68','ATENOLOL TAB 50MG','ATENOLOL TAB 50MG','General',2.00,3.00,'Box',47,0,'2025-12-29 09:34:55'),('P-1767000895682-55-8cqu7','ATORVASTATIN TAB 10MG','ATORVASTATIN TAB 10MG','General',2.00,2.00,'Box',66,0,'2025-12-29 09:34:55'),('P-1767000895682-56-15xeg','ATORVASTATIN TABS 20MG','ATORVASTATIN TABS 20MG','General',1.00,2.00,'Box',70,0,'2025-12-29 09:34:55'),('P-1767000895682-57-0ormg','ATROPINE INJ','ATROPINE INJ','General',997.11,1.00,'Box',110,0,'2025-12-29 09:34:55'),('P-1767000895682-58-te8su','AZITHROMYCIN SYRUP BOTTLE 15MLS','AZITHROMYCIN SYRUP BOTTLE 15MLS','General',1.00,1.00,'Box',105,0,'2025-12-29 09:34:55'),('P-1767000895682-59-e0u19','AZITHROMYCIN TAB 500MG NOT AZUM','AZITHROMYCIN TAB 500MG NOT AZUM','General',1.00,1.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895682-6-266ib','ACTION TAB','ACTION TAB','General',6.00,7.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-60-7zr54','AZUMA TAB 250MG','AZUMA TAB 250MG','General',1.00,1.00,'Box',164,0,'2025-12-29 09:34:55'),('P-1767000895682-61-5vplr','AZUMA TAB 500MG','AZUMA TAB 500MG','General',1.00,2.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895682-62-rt2u9','BABY WIPES','BABY WIPES','General',2.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-63-q5lk1','BAHASHA KAKI 100\'S','BAHASHA KAKI 100\'S','General',719.90,1.00,'Box',70,0,'2025-12-29 09:34:55'),('P-1767000895682-64-4xlc9','BAHASHA KAKI KUBWA 120\'S','BAHASHA KAKI KUBWA 120\'S','General',4.00,6.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-65-x9cla','BBE SOLUTION','BBE SOLUTION','General',754.20,1.00,'Box',199,0,'2025-12-29 09:34:55'),('P-1767000895682-66-7nytz','BELLADONA SYRUP 100ML BOTTLE','BELLADONA SYRUP 100ML BOTTLE','General',1.00,1.00,'Box',359,0,'2025-12-29 09:34:55'),('P-1767000895682-67-sy4lx','BENDROFLUMETHIAZIDE TAB','BENDROFLUMETHIAZIDE TAB','General',6.00,6.00,'Box',33,0,'2025-12-29 09:34:55'),('P-1767000895682-68-0vdtv','BENZATHINE PENICILLIN INJ PENAD','BENZATHINE PENICILLIN INJ PENAD','General',796.34,950.00,'Box',126,0,'2025-12-29 09:34:55'),('P-1767000895682-69-finfx','BENZYL PENICILLIN INJ 5000000IU','BENZYL PENICILLIN INJ 5000000IU','General',800.00,950.00,'Box',146,0,'2025-12-29 09:34:55'),('P-1767000895682-7-nrivm','ACYCLOVIR EYE OINTMENT','ACYCLOVIR EYE OINTMENT','General',3.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-70-ow1bb','BETACORT N CREAM','BETACORT N CREAM','General',2.00,2.00,'Box',320,0,'2025-12-29 09:34:55'),('P-1767000895682-71-h6sru','BETADERM CREAM','BETADERM CREAM','General',2.00,3.00,'Box',3,0,'2025-12-29 09:34:55'),('P-1767000895682-72-e3jpf','BETASIL SYRUP CHILD','BETASIL SYRUP CHILD','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-73-71bnb','BETROZOLE SYRUP','BETROZOLE SYRUP','General',2.00,2.00,'Box',113,0,'2025-12-29 09:34:55'),('P-1767000895682-74-o4xbq','BISACODYL TAB','BISACODYL TAB','General',3.00,4.00,'Box',135,0,'2025-12-29 09:34:55'),('P-1767000895682-75-7al2k','BISOPROLOL TABLET 5MG','BISOPROLOL TABLET 5MG','General',6.00,10.00,'Box',123,0,'2025-12-29 09:34:55'),('P-1767000895682-76-obnu0','BISOPROLOL TABLET10MG','BISOPROLOL TABLET10MG','General',8.00,10.00,'Box',210,0,'2025-12-29 09:34:55'),('P-1767000895682-77-cq112','BLOOD GIVING SET','BLOOD GIVING SET','General',610.69,1.00,'Box',21,0,'2025-12-29 09:34:55'),('P-1767000895682-78-c0n2q','BONISAN','BONISAN','General',6.00,8.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-79-wq92n','BORIC ACID EAR DROP BOTTLE','BORIC ACID EAR DROP BOTTLE','General',650.00,1.00,'Box',18,0,'2025-12-29 09:34:55'),('P-1767000895682-8-rvjb6','ACYCLOVIR SKIN CREAM TUBE','ACYCLOVIR SKIN CREAM TUBE','General',1.00,1.00,'Box',81,0,'2025-12-29 09:34:55'),('P-1767000895682-80-aj6o9','BROMOCRIPTINE TAB','BROMOCRIPTINE TAB','General',16.00,18.00,'Box',4,0,'2025-12-29 09:34:55'),('P-1767000895682-81-r2m9w','BROZEN SYRUP 100ML BOTTLE','BROZEN SYRUP 100ML BOTTLE','General',857.12,2.00,'Box',139,0,'2025-12-29 09:34:55'),('P-1767000895682-82-6zei1','BRUSTAN TAB PACKET','BRUSTAN TAB PACKET','General',1.00,2.00,'Box',3,0,'2025-12-29 09:34:55'),('P-1767000895682-83-ppd2o','BURN CREAM 20G','BURN CREAM 20G','General',1.00,1.00,'Box',38,0,'2025-12-29 09:34:55'),('P-1767000895682-84-ofks4','BURNOX CREAM 30G TUBE','BURNOX CREAM 30G TUBE','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-85-6pacq','BURRETE GIVING SET','BURRETE GIVING SET','General',2.00,2.00,'Box',74,0,'2025-12-29 09:34:55'),('P-1767000895682-86-lrmrh','CALAMINE LOTION BOTTLE','CALAMINE LOTION BOTTLE','General',762.20,1.00,'Box',109,0,'2025-12-29 09:34:55'),('P-1767000895682-87-etx47','CANDESARTAN TABS 16MG','CANDESARTAN TABS 16MG','General',12.00,13.00,'Box',153,0,'2025-12-29 09:34:55'),('P-1767000895682-88-2wcah','CANDESARTAN TABS 8MG 30\'s','CANDESARTAN TABS 8MG 30\'s','General',6.00,7.00,'Box',100,0,'2025-12-29 09:34:55'),('P-1767000895682-89-n3lj5','CANDID POWDER','CANDID POWDER','General',3.00,3.00,'Box',22,0,'2025-12-29 09:34:55'),('P-1767000895682-9-ltbrx','ACYCLOVIR TAB 200MG','ACYCLOVIR TAB 200MG','General',9.00,11.00,'Box',52,0,'2025-12-29 09:34:55'),('P-1767000895682-90-b49lh','CANDIDERM CREAM TUBE','CANDIDERM CREAM TUBE','General',2.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-91-z3vy9','CANDISTAT CREAM TUBE','CANDISTAT CREAM TUBE','General',1.00,1.00,'Box',33,0,'2025-12-29 09:34:55'),('P-1767000895682-92-okxx5','CANNULA 18G GREEN','CANNULA 18G GREEN','General',185.09,300.00,'Box',248,0,'2025-12-29 09:34:55'),('P-1767000895682-93-ft309','CANNULA 20G PINK','CANNULA 20G PINK','General',175.13,300.00,'Box',446,0,'2025-12-29 09:34:55'),('P-1767000895682-94-79w7l','CANNULA 22G BLUE','CANNULA 22G BLUE','General',207.07,300.00,'Box',312,0,'2025-12-29 09:34:55'),('P-1767000895682-95-o3en3','CANNULA 24G YELLOW','CANNULA 24G YELLOW','General',180.68,300.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895682-96-cq99m','CAPTOPRIL TAB 25MG','CAPTOPRIL TAB 25MG','General',6.00,8.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-97-f5gwb','CARBAMAZEPINE TABS 200MG','CARBAMAZEPINE TABS 200MG','General',9.00,11.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895682-98-wkh5l','CARBOCISTEINE SYRUP ADULT 5%','CARBOCISTEINE SYRUP ADULT 5%','General',1.00,2.00,'Box',24,0,'2025-12-29 09:34:55'),('P-1767000895682-99-xbry0','CARBOCISTEINE SYRUP CHILD 2%','CARBOCISTEINE SYRUP CHILD 2%','General',1.00,2.00,'Box',77,0,'2025-12-29 09:34:55'),('P-1767000895683-197-0owan','DICLOFENAC GEL TUBE','DICLOFENAC GEL TUBE','General',549.99,750.00,'Box',102,0,'2025-12-29 09:34:55'),('P-1767000895683-198-q3bhj','DICLOFENAC INJ 75MG AMP','DICLOFENAC INJ 75MG AMP','General',150.17,250.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895683-199-sl7z4','DICLOFENAC TABS PACKET','DICLOFENAC TABS PACKET','General',1.00,1.00,'Box',115,0,'2025-12-29 09:34:55'),('P-1767000895683-200-vre8g','DICLOPAR CHUI TABS PACKET','DICLOPAR CHUI TABS PACKET','General',4.00,4.00,'Box',532,0,'2025-12-29 09:34:55'),('P-1767000895683-201-t35bt','DICLOPAR GEL TUBE','DICLOPAR GEL TUBE','General',2.00,2.00,'Box',153,0,'2025-12-29 09:34:55'),('P-1767000895683-202-ag9zp','DICLOPAR MR TAB','DICLOPAR MR TAB','General',1.00,1.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895683-203-yxq0q','DIGOXIN TAB','DIGOXIN TAB','General',9.00,14.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-204-v30kz','DOMPERIDONE 10MG TAB','DOMPERIDONE 10MG TAB','General',7.00,9.00,'Box',134,0,'2025-12-29 09:34:55'),('P-1767000895683-205-7lr3y','DOXYCYCLINE CAPS PACKET','DOXYCYCLINE CAPS PACKET','General',4.00,6.00,'Box',82,0,'2025-12-29 09:34:55'),('P-1767000895683-206-502yd','DR COLD SYRUP BOTTLE','DR COLD SYRUP BOTTLE','General',2.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-207-kk5p7','DR COLD TAB 4\'S','DR COLD TAB 4\'S','General',292.00,340.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895683-208-w1fdv','DUO-COTECXIN CHILD PACKET','DUO-COTECXIN CHILD PACKET','General',3.00,4.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-209-q7xvy','DUO-COTECXIN TAB ADULT 9s PACK','DUO-COTECXIN TAB ADULT 9s PACK','General',6.00,7.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-210-5dryq','DUPHASTON TAB','DUPHASTON TAB','General',19.00,30.00,'Box',20,0,'2025-12-29 09:34:55'),('P-1767000895683-211-za3wm','ECONAZINE CREAM 10G','ECONAZINE CREAM 10G','General',1.00,2.00,'Box',50,0,'2025-12-29 09:34:55'),('P-1767000895683-212-w9q4k','EKEFLIN TAB PACKET','EKEFLIN TAB PACKET','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-213-ko284','ELBOW SUPPORT XL','ELBOW SUPPORT XL','General',8.00,12.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-214-vdbdv','ELYCLOB G CREAM TUBE','ELYCLOB G CREAM TUBE','General',2.00,2.00,'Box',198,0,'2025-12-29 09:34:55'),('P-1767000895683-215-kvtxj','ELYCORT CREAM TUBE','ELYCORT CREAM TUBE','General',1.00,1.00,'Box',275,0,'2025-12-29 09:34:55'),('P-1767000895683-216-wen7g','ELYCORT OINTMENT TUBE','ELYCORT OINTMENT TUBE','General',1.00,1.00,'Box',68,0,'2025-12-29 09:34:55'),('P-1767000895683-217-bkayj','ELYVATE CREAM TUBE','ELYVATE CREAM TUBE','General',1.00,1.00,'Box',141,0,'2025-12-29 09:34:55'),('P-1767000895683-218-y7j20','ELYVATE OINTMENT TUBE','ELYVATE OINTMENT TUBE','General',1.00,1.00,'Box',6,0,'2025-12-29 09:34:55'),('P-1767000895683-219-vj2f0','EMDELYN SYRUP ADULT BOTTLE','EMDELYN SYRUP ADULT BOTTLE','General',1.00,2.00,'Box',131,0,'2025-12-29 09:34:55'),('P-1767000895683-220-z7qbn','EMDELYN SYRUP CHILD 100ML','EMDELYN SYRUP CHILD 100ML','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-221-ddro2','ENALAPRIL TAB','ENALAPRIL TAB','General',6.00,8.00,'Box',31,0,'2025-12-29 09:34:55'),('P-1767000895683-222-megjg','ENEMAX','ENEMAX','General',5.00,5.00,'Box',46,0,'2025-12-29 09:34:55'),('P-1767000895683-223-7rdby','ENO LEMON SACHET','ENO LEMON SACHET','General',13.00,16.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-224-hj2a2','ENO TABS','ENO TABS','General',11.00,13.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-225-puaca','ENOXAPARIN INJ','ENOXAPARIN INJ','General',13.00,15.00,'Box',9,0,'2025-12-29 09:34:55'),('P-1767000895683-226-xmjxj','ENTEZMA OINTMENT TUBE 30GM','ENTEZMA OINTMENT TUBE 30GM','General',4.00,4.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-227-e1p9g','EPHEDRINE INJ.','EPHEDRINE INJ.','General',535.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-228-gulxo','EPHEDRINE NASAL DROP ISORYN CHD','EPHEDRINE NASAL DROP ISORYN CHD','General',1.00,1.00,'Box',696,0,'2025-12-29 09:34:55'),('P-1767000895683-229-w47g8','EPHEDRINE NASAL ISORYN DROP ADT','EPHEDRINE NASAL ISORYN DROP ADT','General',1.00,1.00,'Box',34,0,'2025-12-29 09:34:55'),('P-1767000895683-230-6438g','ERECTO TAB 100MG 1s  PACKET','ERECTO TAB 100MG 1s  PACKET','General',2.00,3.00,'Box',237,0,'2025-12-29 09:34:55'),('P-1767000895683-231-9645g','ERECTO TAB 50MG 1s PACKET','ERECTO TAB 50MG 1s PACKET','General',1.00,1.00,'Box',778,0,'2025-12-29 09:34:55'),('P-1767000895683-232-5inmu','ERYTHROMYCIN TAB PACKET','ERYTHROMYCIN TAB PACKET','General',7.00,8.00,'Box',469,0,'2025-12-29 09:34:55'),('P-1767000895683-233-x2v3t','ERYTHROMYCINE SYRUP 100ML BOTTL','ERYTHROMYCINE SYRUP 100ML BOTTL','General',1.00,1.00,'Box',756,0,'2025-12-29 09:34:55'),('P-1767000895683-234-x5062','ESOMEPRAZOLE 40MG TABS','ESOMEPRAZOLE 40MG TABS','General',5.00,5.00,'Box',62,0,'2025-12-29 09:34:55'),('P-1767000895683-235-g4khi','EUSOL 100ML BOTTLE','EUSOL 100ML BOTTLE','General',425.00,550.00,'Box',22,0,'2025-12-29 09:34:55'),('P-1767000895683-236-hb66a','FASTUM CAP','FASTUM CAP','General',19.00,21.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-237-skk0f','FASTUM GEL 30MG','FASTUM GEL 30MG','General',4.00,5.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-238-kailf','FEEDING TUBE SIZE 16','FEEDING TUBE SIZE 16','General',550.00,700.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-239-4cds1','FEFO TAB 100s PACKET','FEFO TAB 100s PACKET','General',2.00,3.00,'Box',40,0,'2025-12-29 09:34:55'),('P-1767000895683-240-f4nmx','FERRO/ FERROTONE B SYRUP 100ML','FERRO/ FERROTONE B SYRUP 100ML','General',0.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-241-tb5xh','FERROTONE CAPS 50\'S','FERROTONE CAPS 50\'S','General',6.00,7.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-242-6dhsz','FINASTERIDE TABS 5MG 30\'s','FINASTERIDE TABS 5MG 30\'s','General',9.00,12.00,'Box',88,0,'2025-12-29 09:34:55'),('P-1767000895683-243-3awke','FLAMAR MX TABS PACKET','FLAMAR MX TABS PACKET','General',3.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-244-fnuxv','FLAVOUR TAB','FLAVOUR TAB','General',182.50,400.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895683-245-kbvn6','FLUCAMOX CAPS PACKET','FLUCAMOX CAPS PACKET','General',6.00,7.00,'Box',328,0,'2025-12-29 09:34:55'),('P-1767000895683-246-yh8vd','FLUCAMOX SYRUP 100ML BOTTLE','FLUCAMOX SYRUP 100ML BOTTLE','General',5.00,8.00,'Box',9,0,'2025-12-29 09:34:55'),('P-1767000895683-247-j3kkm','FLUCAN TAB 150MG','FLUCAN TAB 150MG','General',450.00,550.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-248-bq8s1','FLUCOMOL CAPS','FLUCOMOL CAPS','General',18.00,22.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-249-xa5y1','FLUCONAZOLE INJ','FLUCONAZOLE INJ','General',1.00,2.00,'Box',28,0,'2025-12-29 09:34:55'),('P-1767000895683-250-dmgna','FLUCONAZOLE TABS 150 MG LOW PRI','FLUCONAZOLE TABS 150 MG LOW PRI','General',220.00,350.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-251-w2seo','FLUCONAZOLE TABS 200MG','FLUCONAZOLE TABS 200MG','General',1.00,3.00,'Box',423,0,'2025-12-29 09:34:55'),('P-1767000895683-252-tds79','FLUCOR DAY','FLUCOR DAY','General',3.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-253-epa3q','FLUTICASONE NASAL SPRAY','FLUTICASONE NASAL SPRAY','General',8.00,11.00,'Box',55,0,'2025-12-29 09:34:55'),('P-1767000895683-254-e7k24','FOLIC ACID TAB PKT','FOLIC ACID TAB PKT','General',1.00,1.00,'Box',39,0,'2025-12-29 09:34:55'),('P-1767000895683-255-znmfw','FOLLEY BALOON CATHETER 2 WAY 16','FOLLEY BALOON CATHETER 2 WAY 16','General',899.94,1.00,'Box',532,0,'2025-12-29 09:34:55'),('P-1767000895683-256-zsvzv','FOLLEY BALOON CATHETER 2 WAY 18','FOLLEY BALOON CATHETER 2 WAY 18','General',995.44,1.00,'Box',508,0,'2025-12-29 09:34:55'),('P-1767000895683-257-dhrpx','FREE STYLE PAD KUBWA','FREE STYLE PAD KUBWA','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-258-rge2m','FREE STYLE PAD NDOGO','FREE STYLE PAD NDOGO','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-259-0rlso','FUNGISTAT CREAM TUBE','FUNGISTAT CREAM TUBE','General',1.00,1.00,'Box',264,0,'2025-12-29 09:34:55'),('P-1767000895683-260-8lr9z','FURAZOL SYRUP','FURAZOL SYRUP','General',0.00,5.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-261-gmd6b','FURAZOLE TABS','FURAZOLE TABS','General',2.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-262-hiu15','FUROSEMIDE INJECTION','FUROSEMIDE INJECTION','General',350.26,600.00,'Box',397,0,'2025-12-29 09:34:55'),('P-1767000895683-263-s17h5','FUROSEMIDE TAB PKT','FUROSEMIDE TAB PKT','General',2.00,2.00,'Box',196,0,'2025-12-29 09:34:55'),('P-1767000895683-264-b6f98','FUSIDIC ACID TUBE','FUSIDIC ACID TUBE','General',3.00,5.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-265-ptn0j','GAUZE BANDAGE 15 CM 12s','GAUZE BANDAGE 15 CM 12s','General',252.02,300.00,'Box',703,0,'2025-12-29 09:34:55'),('P-1767000895683-266-rl1xf','GAUZE BANDAGE 7.5 CM 12s','GAUZE BANDAGE 7.5 CM 12s','General',104.17,130.00,'Box',523,0,'2025-12-29 09:34:55'),('P-1767000895683-267-3b541','GAUZE KUBWA','GAUZE KUBWA','General',17.00,29.00,'Box',19,0,'2025-12-29 09:34:55'),('P-1767000895683-268-j03e8','GENTALENE C CREAM TUBE','GENTALENE C CREAM TUBE','General',2.00,3.00,'Box',33,0,'2025-12-29 09:34:55'),('P-1767000895683-269-1egbg','GENTAMYCIN EYE DROP BOTTLE','GENTAMYCIN EYE DROP BOTTLE','General',300.00,450.00,'Box',85,0,'2025-12-29 09:34:55'),('P-1767000895683-270-sjuda','GENTAMYCIN INJ 80MG AMP','GENTAMYCIN INJ 80MG AMP','General',130.00,240.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895683-271-60kvk','GENTIAN VIOLET GV BOTTLE','GENTIAN VIOLET GV BOTTLE','General',482.26,900.00,'Box',77,0,'2025-12-29 09:34:55'),('P-1767000895683-272-dispv','GENTRIDERM CREAM TUBE','GENTRIDERM CREAM TUBE','General',2.00,2.00,'Box',50,0,'2025-12-29 09:34:55'),('P-1767000895683-273-mt7ak','GENTRISONE CREAM TUBE','GENTRISONE CREAM TUBE','General',2.00,3.00,'Box',87,0,'2025-12-29 09:34:55'),('P-1767000895683-274-777dv','GLIBENCLAMIDE TAB PACKET','GLIBENCLAMIDE TAB PACKET','General',2.00,2.00,'Box',19,0,'2025-12-29 09:34:55'),('P-1767000895683-275-3zubk','GLOVES EXAMINATION','GLOVES EXAMINATION','General',6.00,7.00,'Box',96,0,'2025-12-29 09:34:55'),('P-1767000895683-276-u414r','GLOVES SURGICAL 1PAIR','GLOVES SURGICAL 1PAIR','General',300.00,500.00,'Box',35,0,'2025-12-29 09:34:55'),('P-1767000895683-277-lapbd','GLUCOPLUS MACHINE NO STRIPS','GLUCOPLUS MACHINE NO STRIPS','General',33.00,40.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895683-278-wzwnb','GLUCOPLUS STRIPS 25\'S','GLUCOPLUS STRIPS 25\'S','General',15.00,22.00,'Box',4,0,'2025-12-29 09:34:55'),('P-1767000895683-279-suswl','GLUCOSE 50G','GLUCOSE 50G','General',305.56,390.00,'Box',472,0,'2025-12-29 09:34:55'),('P-1767000895683-280-50pzd','GLUCOSE 80G','GLUCOSE 80G','General',389.98,450.00,'Box',363,0,'2025-12-29 09:34:55'),('P-1767000895683-281-kqiep','GOFEN 200MG(IBUPROFEN)','GOFEN 200MG(IBUPROFEN)','General',12.00,16.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-282-tlrb4','GOFEN 400MG(IBUPROFEN)','GOFEN 400MG(IBUPROFEN)','General',31.00,33.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895683-283-t9xa9','GOODMORNING LOZENGE PACKET','GOODMORNING LOZENGE PACKET','General',7.00,7.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-284-cuyhz','GOODMORNING SYRUP BOTTLE','GOODMORNING SYRUP BOTTLE','General',1.00,1.00,'Box',361,0,'2025-12-29 09:34:55'),('P-1767000895683-285-85coq','GRIPE WATER BABY 100ML BOTTLE','GRIPE WATER BABY 100ML BOTTLE','General',853.15,1.00,'Box',7,0,'2025-12-29 09:34:55'),('P-1767000895683-286-ze5zs','GRIPEWATER WWODWARD\'S','GRIPEWATER WWODWARD\'S','General',1.00,2.00,'Box',330,0,'2025-12-29 09:34:55'),('P-1767000895683-287-5mh5j','GRISEOFLUVIN TAB 500MG PKT','GRISEOFLUVIN TAB 500MG PKT','General',15.00,19.00,'Box',130,0,'2025-12-29 09:34:55'),('P-1767000895683-288-lec6z','GYNAZOLE CREAM TUBE','GYNAZOLE CREAM TUBE','General',4.00,5.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-289-k9mpe','GYNAZOLE PESSARY 3s PACKET','GYNAZOLE PESSARY 3s PACKET','General',5.00,5.00,'Box',297,0,'2025-12-29 09:34:55'),('P-1767000895683-290-5zd81','HALOPERIDOL TAB','HALOPERIDOL TAB','General',6.00,7.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-291-yqq1h','HEDAPAN TABS','HEDAPAN TABS','General',0.00,4.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-292-lms17','HEDEX TABS PACKET','HEDEX TABS PACKET','General',7.00,8.00,'Box',49,0,'2025-12-29 09:34:55'),('P-1767000895683-293-9p1k8','HEDON TABS PACKET','HEDON TABS PACKET','General',3.00,4.00,'Box',83,0,'2025-12-29 09:34:55'),('P-1767000895683-294-op76n','HEKOTOS COUGH LOZENGES','HEKOTOS COUGH LOZENGES','General',7.00,8.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-295-vfqfq','HELIGO KIT TABS 42s PACKET','HELIGO KIT TABS 42s PACKET','General',20.00,28.00,'Box',147,0,'2025-12-29 09:34:55'),('P-1767000895683-296-r3kfc','HEMOVIT CAPS 30\'S','HEMOVIT CAPS 30\'S','General',2.00,4.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895683-297-ttwmb','HEMOVIT SYRUP 200ML BOTTLE','HEMOVIT SYRUP 200ML BOTTLE','General',3.00,4.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-298-w0ih1','HIV KIT','HIV KIT','General',12.00,14.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-299-w6gz4','HOMADEX TABS ACKET','HOMADEX TABS ACKET','General',6.00,8.00,'Box',277,0,'2025-12-29 09:34:55'),('P-1767000895683-300-78a7p','HQ PAD 290MM','HQ PAD 290MM','General',3.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-301-na619','HQ PAD 338MM','HQ PAD 338MM','General',3.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-302-uxogy','HYDRALAZINE TAB','HYDRALAZINE TAB','General',13.00,15.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-303-vsujs','HYDROCORTISINE EYE DROPS','HYDROCORTISINE EYE DROPS','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-304-qscjp','HYDROCORTISINE INJ 100MG','HYDROCORTISINE INJ 100MG','General',800.00,1.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895683-305-lta60','HYDROGEN PEROXIDE 3% BOTTLE','HYDROGEN PEROXIDE 3% BOTTLE','General',350.24,650.00,'Box',848,0,'2025-12-29 09:34:55'),('P-1767000895683-306-9uszi','HYDROGEN PEROXIDE 6%','HYDROGEN PEROXIDE 6%','General',350.10,600.00,'Box',339,0,'2025-12-29 09:34:55'),('P-1767000895683-307-1u2ex','HYDROGEN PEROXIDE EAR DROP BTL','HYDROGEN PEROXIDE EAR DROP BTL','General',750.00,1.00,'Box',156,0,'2025-12-29 09:34:55'),('P-1767000895683-308-pbgyi','HYDROXUREA 500MG','HYDROXUREA 500MG','General',37.00,40.00,'Box',20,0,'2025-12-29 09:34:55'),('P-1767000895683-309-pfsr2','HYOSCINE  TAB','HYOSCINE  TAB','General',6.00,12.00,'Box',41,0,'2025-12-29 09:34:55'),('P-1767000895683-310-ns8mb','I.V PARACETAMOL','I.V PARACETAMOL','General',1.00,2.00,'Box',351,0,'2025-12-29 09:34:55'),('P-1767000895683-311-exfgo','IBUPROFEN SYRUP BOTTLE','IBUPROFEN SYRUP BOTTLE','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-312-jnnrn','IBUPROFEN TABS PKT','IBUPROFEN TABS PKT','General',1.00,2.00,'Box',120,0,'2025-12-29 09:34:55'),('P-1767000895683-313-iuxz4','ILET B2','ILET B2','General',5.00,9.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-314-qqzc5','IMIQUAD CREAM','IMIQUAD CREAM','General',13.00,14.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-315-62uni','INDOMETHACIN CAPS  PACKET','INDOMETHACIN CAPS  PACKET','General',3.00,4.00,'Box',74,0,'2025-12-29 09:34:55'),('P-1767000895683-316-4r9ah','INFLAZONE GEL TUBE','INFLAZONE GEL TUBE','General',2.00,2.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895683-317-4g479','INSULIN LENTE','INSULIN LENTE','General',9.00,11.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-318-slr00','INSULIN MIXTARD','INSULIN MIXTARD','General',8.00,11.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-319-nkewn','INSULIN SOLUBLE','INSULIN SOLUBLE','General',7.00,11.00,'Box',168,0,'2025-12-29 09:34:55'),('P-1767000895683-320-qqbzf','IODINE TOPICAL BOTTLE','IODINE TOPICAL BOTTLE','General',905.37,1.00,'Box',434,0,'2025-12-29 09:34:55'),('P-1767000895683-321-ykg4m','ISOSORBIDE DINITRATE TAB','ISOSORBIDE DINITRATE TAB','General',6.00,7.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-322-9h9h8','ISOSORBIDE MONONITRATE TAB','ISOSORBIDE MONONITRATE TAB','General',22.00,24.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-323-5sh29','ITRACONAZOLE 4\'S CAPS','ITRACONAZOLE 4\'S CAPS','General',2.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-324-yflv3','IV GIVING SET','IV GIVING SET','General',307.36,500.00,'Box',5,0,'2025-12-29 09:34:55'),('P-1767000895683-325-af9ln','IVYTUS SYRUP BOTTLE','IVYTUS SYRUP BOTTLE','General',0.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-326-ma06x','JOINT SUPPORT TAB 30\'S','JOINT SUPPORT TAB 30\'S','General',538.89,550.00,'Box',210,0,'2025-12-29 09:34:55'),('P-1767000895683-327-7iu92','JUNIOR CARE SYRUP BOTTLE','JUNIOR CARE SYRUP BOTTLE','General',1.00,2.00,'Box',172,0,'2025-12-29 09:34:55'),('P-1767000895683-328-v3tj5','KAMAGRA CT 100MG','KAMAGRA CT 100MG','General',1.00,2.00,'Box',21,0,'2025-12-29 09:34:55'),('P-1767000895683-329-rb49a','KETAMINE INJECTION','KETAMINE INJECTION','General',6.00,8.00,'Box',17,0,'2025-12-29 09:34:55'),('P-1767000895683-330-ybmtc','KETOGESIC CAPS PACKET','KETOGESIC CAPS PACKET','General',0.00,6.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-331-5uo8k','KETOKONAZOLE CREAM TUBE 15G','KETOKONAZOLE CREAM TUBE 15G','General',932.93,1.00,'Box',41,0,'2025-12-29 09:34:55'),('P-1767000895683-332-15m97','KINHEAL CREAM','KINHEAL CREAM','General',2.00,2.00,'Box',345,0,'2025-12-29 09:34:55'),('P-1767000895683-333-nraop','KNEE WRAP WITH LOOP ELASTIC TEC','KNEE WRAP WITH LOOP ELASTIC TEC','General',15.00,22.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-334-hm3h1','KOFLAME TABS  PACKET 10\'S','KOFLAME TABS  PACKET 10\'S','General',1.00,1.00,'Box',495,0,'2025-12-29 09:34:55'),('P-1767000895683-335-a56ix','KOFLYN SYRUP ADULT BOTTLE','KOFLYN SYRUP ADULT BOTTLE','General',1.00,1.00,'Box',585,0,'2025-12-29 09:34:55'),('P-1767000895683-336-gbfxx','KOFLYN SYRUP CHILD BOTTLE','KOFLYN SYRUP CHILD BOTTLE','General',1.00,1.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895683-337-73m9n','KOFOL SYRUP','KOFOL SYRUP','General',949.04,1.00,'Box',19,0,'2025-12-29 09:34:55'),('P-1767000895683-338-ppkvq','KY GEL','KY GEL','General',4.00,7.00,'Box',67,0,'2025-12-29 09:34:55'),('P-1767000895683-339-6i742','LACTOGEN 1 FORMULAR 400G','LACTOGEN 1 FORMULAR 400G','General',18.00,25.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-340-8e9wy','LACTULOSE 100ML BOTT','LACTULOSE 100ML BOTT','General',3.00,3.00,'Box',69,0,'2025-12-29 09:34:55'),('P-1767000895683-341-yeoms','LAEFIN TAB PACKET','LAEFIN TAB PACKET','General',656.64,850.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895683-342-7b8iz','LANSOPRAZOLE CAP 30\'s','LANSOPRAZOLE CAP 30\'s','General',5.00,4.00,'Box',296,0,'2025-12-29 09:34:55'),('P-1767000895683-343-hal80','LEVAMISOLE SYRUP BOTTLE','LEVAMISOLE SYRUP BOTTLE','General',900.39,1.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895683-344-5fv56','LEVAMISOLE TAB 3s PACK','LEVAMISOLE TAB 3s PACK','General',3.00,4.00,'Box',40,0,'2025-12-29 09:34:55'),('P-1767000895683-345-93bph','LEVOFLOXACIN TAB 10\'S','LEVOFLOXACIN TAB 10\'S','General',4.00,6.00,'Box',224,0,'2025-12-29 09:34:55'),('P-1767000895683-346-36f2q','LIGNOCAINE INJ.','LIGNOCAINE INJ.','General',548.34,1.00,'Box',331,0,'2025-12-29 09:34:55'),('P-1767000895683-347-zonyk','LINCODERM CREAM TUBE','LINCODERM CREAM TUBE','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-348-t3g8p','LOPERAMIDE TAB','LOPERAMIDE TAB','General',6.00,7.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-349-5tivh','LORATADINE SYRUP','LORATADINE SYRUP','General',5.00,6.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-350-zc3po','LORATIDINE TAB 100\'S','LORATIDINE TAB 100\'S','General',6.00,7.00,'Box',51,0,'2025-12-29 09:34:55'),('P-1767000895683-351-kyf8m','LOSARTAN-HYDROCHLOROTHIAZIDE TB','LOSARTAN-HYDROCHLOROTHIAZIDE TB','General',2.00,3.00,'Box',354,0,'2025-12-29 09:34:55'),('P-1767000895683-352-2i9xa','LOSARTAN TAB 50MG','LOSARTAN TAB 50MG','General',2.00,2.00,'Box',196,0,'2025-12-29 09:34:55'),('P-1767000895683-353-kuz5y','LUCIN CREAM TUBE','LUCIN CREAM TUBE','General',1.00,1.00,'Box',501,0,'2025-12-29 09:34:55'),('P-1767000895683-354-u0qaz','LUCIN OINTMENT TUBE','LUCIN OINTMENT TUBE','General',1.00,1.00,'Box',240,0,'2025-12-29 09:34:55'),('P-1767000895683-355-qmdgo','LUMERAX/LONART-DS 6TAB','LUMERAX/LONART-DS 6TAB','General',2.00,3.00,'Box',58,0,'2025-12-29 09:34:55'),('P-1767000895683-356-fcf7a','M2 TONE TAB 60\'S','M2 TONE TAB 60\'S','General',10.00,18.00,'Box',36,0,'2025-12-29 09:34:55'),('P-1767000895683-357-8svhr','MAGNESIUM TAB BLISTER 100\'S MAG','MAGNESIUM TAB BLISTER 100\'S MAG','General',1.00,1.00,'Box',927,0,'2025-12-29 09:34:55'),('P-1767000895683-358-ecn08','MAJI MADOGO','MAJI MADOGO','General',375.00,400.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-359-gm15l','MAJI MAKUBWA','MAJI MAKUBWA','General',833.05,800.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-360-yqmzh','MALAFIN 1PKT','MALAFIN 1PKT','General',600.06,790.00,'Box',3,0,'2025-12-29 09:34:55'),('P-1767000895683-361-sphsq','MARAMOL TABS PACKET','MARAMOL TABS PACKET','General',0.00,8.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-362-6zec3','MEBENDAZOLE 1TAB','MEBENDAZOLE 1TAB','General',2.00,2.00,'Box',65,0,'2025-12-29 09:34:55'),('P-1767000895683-363-530qw','MEBENDAZOLE SYRUP BOTTLE','MEBENDAZOLE SYRUP BOTTLE','General',750.67,1.00,'Box',3,0,'2025-12-29 09:34:55'),('P-1767000895683-364-qjsvu','MEBO OINTMENT TUBE','MEBO OINTMENT TUBE','General',4.00,16.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-365-xq2fb','MEDI-ORAL BOTTLE','MEDI-ORAL BOTTLE','General',2.00,2.00,'Box',130,0,'2025-12-29 09:34:55'),('P-1767000895683-366-6mddj','MEDIPLAST','MEDIPLAST','General',2.00,2.00,'Box',4,0,'2025-12-29 09:34:55'),('P-1767000895683-367-dvda9','MEDIVEN CREAM TUBE','MEDIVEN CREAM TUBE','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-368-6rq3k','MEDIVEN OINTMENT TUBE','MEDIVEN OINTMENT TUBE','General',1.00,1.00,'Box',34,0,'2025-12-29 09:34:55'),('P-1767000895683-369-k0oje','MEFENAMIC ACID TAB PKT','MEFENAMIC ACID TAB PKT','General',5.00,6.00,'Box',11,0,'2025-12-29 09:34:55'),('P-1767000895683-370-ld3qg','MELOXICAM TAB 15MG','MELOXICAM TAB 15MG','General',8.00,12.00,'Box',14,0,'2025-12-29 09:34:55'),('P-1767000895683-371-p2jml','MENTHO PLUS KUBWA','MENTHO PLUS KUBWA','General',0.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-372-4lyzl','MENTHO PLUS NDOGO','MENTHO PLUS NDOGO','General',0.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-373-puoa8','MENTHODEX LOZENGES 6s PACKET','MENTHODEX LOZENGES 6s PACKET','General',3.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-374-s6q4j','MENTHODEX SYRUP 100MLS BOTTLE','MENTHODEX SYRUP 100MLS BOTTLE','General',6.00,6.00,'Box',241,0,'2025-12-29 09:34:55'),('P-1767000895683-375-45pj3','METFORMIN TAB PACKET','METFORMIN TAB PACKET','General',2.00,3.00,'Box',19,0,'2025-12-29 09:34:55'),('P-1767000895683-376-wzz9r','METHYLATED SPIRIT 100ML','METHYLATED SPIRIT 100ML','General',403.68,650.00,'Box',454,0,'2025-12-29 09:34:55'),('P-1767000895683-377-4elnm','METHYLCELLULOSE EYE DROP','METHYLCELLULOSE EYE DROP','General',3.00,4.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-378-xv5qa','METHYLDOPA TAB PACKET','METHYLDOPA TAB PACKET','General',9.00,12.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-379-myrtk','METOCLOPOPAMIDE INJ','METOCLOPOPAMIDE INJ','General',395.00,650.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895683-380-ynsk2','METOCLOPOPAMIDE TAB','METOCLOPOPAMIDE TAB','General',8.00,11.00,'Box',3,0,'2025-12-29 09:34:55'),('P-1767000895683-381-egqlm','METOPROLOL TABS','METOPROLOL TABS','General',8.00,9.00,'Box',80,0,'2025-12-29 09:34:55'),('P-1767000895683-382-o8c15','METRO ORAL GEL (DENTA) TUBE','METRO ORAL GEL (DENTA) TUBE','General',3.00,3.00,'Box',132,0,'2025-12-29 09:34:55'),('P-1767000895683-383-upkpg','METRO SKIN GEL TUBE','METRO SKIN GEL TUBE','General',3.00,3.00,'Box',72,0,'2025-12-29 09:34:55'),('P-1767000895683-384-ytxz0','METROGYL TAB COATED','METROGYL TAB COATED','General',1.00,1.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895683-385-b4hmv','METRONIDAZOLE INJ','METRONIDAZOLE INJ','General',550.00,950.00,'Box',614,0,'2025-12-29 09:34:55'),('P-1767000895683-386-75vcn','METRONIDAZOLE SYRUP 100ML BOTTL','METRONIDAZOLE SYRUP 100ML BOTTL','General',946.51,1.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895683-387-3pujx','METRONIDAZOLE TAB NOT COATED','METRONIDAZOLE TAB NOT COATED','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-388-5tlir','MICONAZOLE CREAM OTHERSLOW PRIC','MICONAZOLE CREAM OTHERSLOW PRIC','General',665.00,790.00,'Box',392,0,'2025-12-29 09:34:55'),('P-1767000895683-389-tyxev','MICONAZOLE ORAL GEL TUBE','MICONAZOLE ORAL GEL TUBE','General',2.00,2.00,'Box',251,0,'2025-12-29 09:34:55'),('P-1767000895683-390-9kv81','MIFUPEN TAB  PACKET','MIFUPEN TAB  PACKET','General',4.00,5.00,'Box',25,0,'2025-12-29 09:34:55'),('P-1767000895683-391-c0xsz','MISWAKI 550','MISWAKI 550','General',417.00,550.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-392-q9h4d','MISWAKI YA 2,000/=','MISWAKI YA 2,000/=','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-393-3rv1l','MISWAKI YA SH 500','MISWAKI YA SH 500','General',183.00,250.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-394-fp84y','MONTELUKAST TAB 10MG','MONTELUKAST TAB 10MG','General',7.00,12.00,'Box',33,0,'2025-12-29 09:34:55'),('P-1767000895683-395-lo1s0','MOSQUITOR REPELANT FAMILY 100ML','MOSQUITOR REPELANT FAMILY 100ML','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-396-7jljy','MOSQUITOR REPELANT FAMILY 70ML','MOSQUITOR REPELANT FAMILY 70ML','General',648.04,950.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-397-wpjmw','MRDT KIT','MRDT KIT','General',13.00,16.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-398-bl8je','MUCKINTOSH PER 1METRE','MUCKINTOSH PER 1METRE','General',3.00,4.00,'Box',206,0,'2025-12-29 09:34:55'),('P-1767000895683-399-eqnnn','MUCOGEL SYRUP BOTTLE','MUCOGEL SYRUP BOTTLE','General',3.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-400-v3szt','MUCOLYN SYRUP ADULT BOTTLE','MUCOLYN SYRUP ADULT BOTTLE','General',1.00,1.00,'Box',480,0,'2025-12-29 09:34:55'),('P-1767000895683-401-jtaqo','MUCOLYN SYRUP CHILD BOTTLE','MUCOLYN SYRUP CHILD BOTTLE','General',1.00,1.00,'Box',459,0,'2025-12-29 09:34:55'),('P-1767000895683-402-4hgsv','MULTIVITAMIN SYRUP 100ML BOTTLE','MULTIVITAMIN SYRUP 100ML BOTTLE','General',1.00,1.00,'Box',18,0,'2025-12-29 09:34:55'),('P-1767000895683-403-76eqg','MULTIVITAMIN TAB PKT','MULTIVITAMIN TAB PKT','General',6.00,9.00,'Box',134,0,'2025-12-29 09:34:55'),('P-1767000895683-404-mfurs','MUPIROCIN OINTMENT','MUPIROCIN OINTMENT','General',2.00,3.00,'Box',25,0,'2025-12-29 09:34:55'),('P-1767000895683-405-118yz','MUSCLE PLUS TAB 20\'S PKT','MUSCLE PLUS TAB 20\'S PKT','General',2.00,3.00,'Box',191,0,'2025-12-29 09:34:55'),('P-1767000895683-406-3nwr4','N.S NASAL SPRAY','N.S NASAL SPRAY','General',1.00,1.00,'Box',114,0,'2025-12-29 09:34:55'),('P-1767000895683-407-z3r9g','NASAL GASTRIC FEEDING TUBE 10','NASAL GASTRIC FEEDING TUBE 10','General',536.12,800.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-408-5fzd0','NASAL GASTRIC FEEDING TUBE 16','NASAL GASTRIC FEEDING TUBE 16','General',850.00,1.00,'Box',180,0,'2025-12-29 09:34:55'),('P-1767000895683-409-d3uft','NASAL GASTRIC FEEDING TUBE 18','NASAL GASTRIC FEEDING TUBE 18','General',550.00,800.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-410-787w0','NAT B TAB','NAT B TAB','General',11.00,12.00,'Box',6,0,'2025-12-29 09:34:55'),('P-1767000895683-411-gzqnm','NATURAL TEARS DROP','NATURAL TEARS DROP','General',8.00,8.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-412-xoh61','NAUMA GEL','NAUMA GEL','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-413-ltmwl','NEURO FORTE TABS','NEURO FORTE TABS','General',6.00,6.00,'Box',104,0,'2025-12-29 09:34:55'),('P-1767000895683-414-3vpgw','NEURO SUPPORT TAB','NEURO SUPPORT TAB','General',378.98,450.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895683-415-c52yn','NEUROBION FORTE 30\'S TAB','NEUROBION FORTE 30\'S TAB','General',2.00,3.00,'Box',43,0,'2025-12-29 09:34:55'),('P-1767000895683-416-4zmjv','NEUROTON TAB','NEUROTON TAB','General',10.00,13.00,'Box',65,0,'2025-12-29 09:34:55'),('P-1767000895683-417-jkhwv','NIFEDIPINE TAB','NIFEDIPINE TAB','General',2.00,3.00,'Box',28,0,'2025-12-29 09:34:55'),('P-1767000895683-418-16n6n','NITAZOXANIDE TABS 500MG','NITAZOXANIDE TABS 500MG','General',4.00,6.00,'Box',80,0,'2025-12-29 09:34:55'),('P-1767000895683-419-fg72z','NITROFURANTOIN TAB','NITROFURANTOIN TAB','General',5.00,6.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-420-2aays','NJOI TAB PACKET','NJOI TAB PACKET','General',300.00,600.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895683-421-5vxyo','NOR-T TAB 10\'S','NOR-T TAB 10\'S','General',1.00,1.00,'Box',949,0,'2025-12-29 09:34:55'),('P-1767000895683-422-w4hbm','NORETHISTERONE TAB 30\'S','NORETHISTERONE TAB 30\'S','General',6.00,8.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-423-nihqf','NORFLOXACIN TAB','NORFLOXACIN TAB','General',17.00,19.00,'Box',510,0,'2025-12-29 09:34:55'),('P-1767000895683-424-5otxa','NORMAL SALINE  (N.S) BOTTLE','NORMAL SALINE  (N.S) BOTTLE','General',942.13,1.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-425-v76lg','NORZOLE TAB BOX 10\'S','NORZOLE TAB BOX 10\'S','General',1.00,2.00,'Box',32,0,'2025-12-29 09:34:55'),('P-1767000895683-426-e3r1i','NYLON SIZE 2','NYLON SIZE 2','General',1.00,2.00,'Box',12,0,'2025-12-29 09:34:55'),('P-1767000895683-427-a8kpy','NYSTATIN PESSARIES','NYSTATIN PESSARIES','General',1.00,1.00,'Box',5,0,'2025-12-29 09:34:55'),('P-1767000895683-428-ok951','NYSTATIN SUSPENSION ORAL BOTTLE','NYSTATIN SUSPENSION ORAL BOTTLE','General',1.00,1.00,'Box',204,0,'2025-12-29 09:34:55'),('P-1767000895683-429-qczdf','NYSTATIN TAB','NYSTATIN TAB','General',17.00,23.00,'Box',4,0,'2025-12-29 09:34:55'),('P-1767000895683-430-t9s4w','OMEPRAZOLE CAP','OMEPRAZOLE CAP','General',2.00,3.00,'Box',133,0,'2025-12-29 09:34:55'),('P-1767000895683-431-8olz7','OMEPRAZOLE INJ','OMEPRAZOLE INJ','General',3.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-432-uxgym','OPELELOTION BOTTLE','OPELELOTION BOTTLE','General',2.00,3.00,'Box',76,0,'2025-12-29 09:34:55'),('P-1767000895683-433-amugc','ORACURE GEL','ORACURE GEL','General',4.00,5.00,'Box',7,0,'2025-12-29 09:34:55'),('P-1767000895683-434-quxnf','ORNIDAZOLE TABS 500MG','ORNIDAZOLE TABS 500MG','General',36.00,47.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-435-7yr1b','ORODAR TAB 3s PACKET','ORODAR TAB 3s PACKET','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-436-n3jsx','ORS SACHET','ORS SACHET','General',180.00,220.00,'Box',11,0,'2025-12-29 09:34:55'),('P-1767000895683-437-elfiu','OSTEOMIN TABS 30\'s','OSTEOMIN TABS 30\'s','General',18.00,35.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-438-br35y','OXYTOCIN INJ','OXYTOCIN INJ','General',950.00,1.00,'Box',234,0,'2025-12-29 09:34:55'),('P-1767000895683-439-jewok','P.O.P 15CM','P.O.P 15CM','General',1.00,1.00,'Box',122,0,'2025-12-29 09:34:55'),('P-1767000895683-440-781s3','P2 BRAND','P2 BRAND','General',1.00,1.00,'Box',300,0,'2025-12-29 09:34:55'),('P-1767000895683-441-0ss8t','P2 TAB PACKET 1/P','P2 TAB PACKET 1/P','General',759.25,1.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895683-442-cw52j','P2 TABS 2/P','P2 TABS 2/P','General',1.00,1.00,'Box',1,0,'2025-12-29 09:34:55'),('P-1767000895683-443-k9lef','PACIFY ORGANIC PADS','PACIFY ORGANIC PADS','General',2.00,3.00,'Box',48,0,'2025-12-29 09:34:55'),('P-1767000895683-444-4k7pt','PAMBA STICK EAR 1000','PAMBA STICK EAR 1000','General',500.00,750.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-445-ctb4o','PAMBA STICK EAR 500','PAMBA STICK EAR 500','General',375.00,350.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-446-t7pa1','PAMPERS 0-6KG [14]','PAMPERS 0-6KG [14]','General',3.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-447-8dsnv','PAMPERS 0-6KG[48]','PAMPERS 0-6KG[48]','General',0.00,15.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-448-efol5','PAMPERS 6-9 [12]','PAMPERS 6-9 [12]','General',2.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-449-wwfso','PAMPERS 6-9KG[42]','PAMPERS 6-9KG[42]','General',0.00,15.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-450-qzfu7','PAMPERS 9-15[40]','PAMPERS 9-15[40]','General',375.00,15.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-451-0jy7t','PAMPERS 9-15KG[10]','PAMPERS 9-15KG[10]','General',3.00,3.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-452-konyx','PANADOL ADVANCE TAB','PANADOL ADVANCE TAB','General',5.00,8.00,'Box',133,0,'2025-12-29 09:34:55'),('P-1767000895683-453-dyavm','PANADOL EXTRA TAB','PANADOL EXTRA TAB','General',9.00,11.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-454-7r1pg','PANTOPRAZOLE INJ','PANTOPRAZOLE INJ','General',2.00,4.00,'Box',167,0,'2025-12-29 09:34:55'),('P-1767000895683-455-94lrq','PANTOPRAZOLE TAB 30\'S','PANTOPRAZOLE TAB 30\'S','General',3.00,4.00,'Box',202,0,'2025-12-29 09:34:55'),('P-1767000895683-456-cxewx','PARACETAMOL SUPPOSITORIES 10\'s','PARACETAMOL SUPPOSITORIES 10\'s','General',5.00,6.00,'Box',9,0,'2025-12-29 09:34:55'),('P-1767000895683-457-8sbym','PARACETAMOL SYRUP BOTTLE','PARACETAMOL SYRUP BOTTLE','General',840.58,1.00,'Box',9,0,'2025-12-29 09:34:55'),('P-1767000895683-458-expy0','PARACETAMOL TABS PACKET','PARACETAMOL TABS PACKET','General',1.00,1.00,'Box',2,0,'2025-12-29 09:34:55'),('P-1767000895683-459-0lphl','PARAFIN GAUZE','PARAFIN GAUZE','General',600.00,1.00,'Box',460,0,'2025-12-29 09:34:55'),('P-1767000895683-460-4rer7','PEDZINC SYRUP BOTTLE','PEDZINC SYRUP BOTTLE','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-461-3mysh','PEDZINC TAB PACKET','PEDZINC TAB PACKET','General',498.89,600.00,'Box',146,0,'2025-12-29 09:34:55'),('P-1767000895683-462-r7gbw','PEN V SYRUP 100ML BOTTLE','PEN V SYRUP 100ML BOTTLE','General',2.00,2.00,'Box',10,0,'2025-12-29 09:34:55'),('P-1767000895683-463-cz82n','PEN V TAB PACKET','PEN V TAB PACKET','General',4.00,6.00,'Box',76,0,'2025-12-29 09:34:55'),('P-1767000895683-464-61vwm','PERSOL 2.5 GEL TUBE','PERSOL 2.5 GEL TUBE','General',3.00,3.00,'Box',39,0,'2025-12-29 09:34:55'),('P-1767000895683-465-cxsu3','PERSOL 5 GEL TUBE','PERSOL 5 GEL TUBE','General',3.00,3.00,'Box',66,0,'2025-12-29 09:34:55'),('P-1767000895683-466-2lm2p','PERSOL FORTE TUBE','PERSOL FORTE TUBE','General',3.00,4.00,'Box',379,0,'2025-12-29 09:34:56'),('P-1767000895683-467-n34zh','PHAMACTIN SYRUP 100ML BOTTLE','PHAMACTIN SYRUP 100ML BOTTLE','General',2.00,2.00,'Box',54,0,'2025-12-29 09:34:56'),('P-1767000895683-468-kk00b','PHENOBABITONE INJECTION','PHENOBABITONE INJECTION','General',3.00,7.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895683-469-av1q3','PHENOBARBITONE TAB 30MG PKT','PHENOBARBITONE TAB 30MG PKT','General',3.00,4.00,'Box',17,0,'2025-12-29 09:34:56'),('P-1767000895683-470-bmaqq','PIRITON SYRUP BOTTLE','PIRITON SYRUP BOTTLE','General',1.00,1.00,'Box',291,0,'2025-12-29 09:34:56'),('P-1767000895683-471-hb09j','PIRITON TABS  PACKET','PIRITON TABS  PACKET','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895683-472-m2dt4','PIROXICAM CAP PACKET','PIROXICAM CAP PACKET','General',2.00,3.00,'Box',966,0,'2025-12-29 09:34:56'),('P-1767000895683-473-d7yag','PIROXICAM GEL B.P','PIROXICAM GEL B.P','General',2.00,4.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895683-474-7mzec','PLASTER 1.25CM','PLASTER 1.25CM','General',520.00,700.00,'Box',202,0,'2025-12-29 09:34:56'),('P-1767000895683-475-260lp','PLASTER 2.5 CM','PLASTER 2.5 CM','General',860.00,1.00,'Box',11,0,'2025-12-29 09:34:56'),('P-1767000895683-476-rq8z5','PLASTER 5 CM','PLASTER 5 CM','General',1.00,1.00,'Box',69,0,'2025-12-29 09:34:56'),('P-1767000895683-477-qfv09','PLASTER 7.5 CM','PLASTER 7.5 CM','General',1.00,2.00,'Box',149,0,'2025-12-29 09:34:56'),('P-1767000895683-478-8nxft','PODOPHYLLIN OINT.','PODOPHYLLIN OINT.','General',32.00,40.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895683-479-lv14n','POTTASIUM PERMANGANATE 100MLS','POTTASIUM PERMANGANATE 100MLS','General',510.74,800.00,'Box',102,0,'2025-12-29 09:34:56'),('P-1767000895683-480-lr7xh','POVIDONE IODINE 250MLS','POVIDONE IODINE 250MLS','General',509.20,3.00,'Box',434,0,'2025-12-29 09:34:56'),('P-1767000895683-481-50cow','PPF INJ','PPF INJ','General',800.00,950.00,'Box',17,0,'2025-12-29 09:34:56'),('P-1767000895683-482-bbsog','PRAZIQUANTEL TAB 600MG','PRAZIQUANTEL TAB 600MG','General',30.00,34.00,'Box',3,0,'2025-12-29 09:34:56'),('P-1767000895683-483-t1c8c','PREDNISOLONE EYE DROP','PREDNISOLONE EYE DROP','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895683-484-3m13z','PREDNISOLONE TAB PACKET','PREDNISOLONE TAB PACKET','General',1.00,2.00,'Box',1,0,'2025-12-29 09:34:56'),('P-1767000895683-485-tv4yr','PREGABALIN 75MG TAB','PREGABALIN 75MG TAB','General',3.00,4.00,'Box',94,0,'2025-12-29 09:34:56'),('P-1767000895683-486-iujfi','PRINALYN ADULT SYRUP','PRINALYN ADULT SYRUP','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895683-487-x9tku','PRINALYN CHILD SYRUP','PRINALYN CHILD SYRUP','General',1.00,1.00,'Box',236,0,'2025-12-29 09:34:56'),('P-1767000895683-488-ti34m','PROMETHAZINE INJECTION','PROMETHAZINE INJECTION','General',380.00,650.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895683-489-0cpkm','PROMETHAZINE SYRUP BOTTLE','PROMETHAZINE SYRUP BOTTLE','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895683-490-dvjfb','PROMETHAZINE TABS','PROMETHAZINE TABS','General',2.00,3.00,'Box',35,0,'2025-12-29 09:34:56'),('P-1767000895683-491-pm6bc','PROPRANOLOL TAB','PROPRANOLOL TAB','General',9.00,10.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895683-492-n6w49','PROTEX SOAP 150G KUBWA','PROTEX SOAP 150G KUBWA','General',2.00,2.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895683-493-2c6m9','PROTEX SOAP 90G NDOGO','PROTEX SOAP 90G NDOGO','General',1.00,1.00,'Box',228,0,'2025-12-29 09:34:56'),('P-1767000895683-494-b1s58','PYRIDOXINE VITAMIN B6 60\'S','PYRIDOXINE VITAMIN B6 60\'S','General',15.00,19.00,'Box',14,0,'2025-12-29 09:34:56'),('P-1767000895683-495-0jqex','QUININE INJ 600MG','QUININE INJ 600MG','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895683-496-x274o','QUININE SYRUP 100ML BOTTLE','QUININE SYRUP 100ML BOTTLE','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895683-497-648mo','QUININE TAB','QUININE TAB','General',9.00,12.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895683-498-o5yfb','RABEPRAZOLE 30MG TABS','RABEPRAZOLE 30MG TABS','General',2.00,1.00,'Box',45,0,'2025-12-29 09:34:56'),('P-1767000895683-499-wtkwt','RELCER GEL 100ML','RELCER GEL 100ML','General',1.00,1.00,'Box',268,0,'2025-12-29 09:34:56'),('P-1767000895684-500-uq4ss','RELCER GEL 180ML','RELCER GEL 180ML','General',3.00,3.00,'Box',148,0,'2025-12-29 09:34:56'),('P-1767000895684-501-niplz','REPACE - H 30\'s','REPACE - H 30\'s','General',12.00,15.00,'Box',49,0,'2025-12-29 09:34:56'),('P-1767000895684-502-zirv4','RINGER LACTATE (R.L)','RINGER LACTATE (R.L)','General',980.00,1.00,'Box',49,0,'2025-12-29 09:34:56'),('P-1767000895684-503-epq3c','ROSUVASTATIN TABS 20MG','ROSUVASTATIN TABS 20MG','General',9.00,12.00,'Box',24,0,'2025-12-29 09:34:56'),('P-1767000895684-504-bqdok','ROUGH RIDER','ROUGH RIDER','General',2.00,3.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-505-88rll','SAFI CREAM TUBE','SAFI CREAM TUBE','General',2.00,2.00,'Box',1,0,'2025-12-29 09:34:56'),('P-1767000895684-506-3gytc','SALBUTAMOL INHALER','SALBUTAMOL INHALER','General',3.00,3.00,'Box',273,0,'2025-12-29 09:34:56'),('P-1767000895684-507-xae33','SALBUTAMOL SYRUP BOTTLE','SALBUTAMOL SYRUP BOTTLE','General',800.00,1.00,'Box',306,0,'2025-12-29 09:34:56'),('P-1767000895684-508-ca560','SALBUTAMOL TAB  PACKET','SALBUTAMOL TAB  PACKET','General',1.00,1.00,'Box',189,0,'2025-12-29 09:34:56'),('P-1767000895684-509-fbuw8','SALIMIA LINIMENT 60MLS','SALIMIA LINIMENT 60MLS','General',2.00,2.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-510-4nqv0','SCALP VEIN (BUTTERFLY)','SCALP VEIN (BUTTERFLY)','General',150.16,250.00,'Box',60,0,'2025-12-29 09:34:56'),('P-1767000895684-511-g5k4q','SCOTT\'S SYRUP ORANGE 100ML','SCOTT\'S SYRUP ORANGE 100ML','General',5.00,5.00,'Box',6,0,'2025-12-29 09:34:56'),('P-1767000895684-512-yfsik','SCOTT\'S SYRUP ORIGINAL 100ML','SCOTT\'S SYRUP ORIGINAL 100ML','General',5.00,5.00,'Box',60,0,'2025-12-29 09:34:56'),('P-1767000895684-513-gdjmj','SECNIDAZOLE TAB 2s PACKET','SECNIDAZOLE TAB 2s PACKET','General',800.00,1.00,'Box',1,0,'2025-12-29 09:34:56'),('P-1767000895684-514-dplb9','SEDITON SYRUP GREEN BOTTLE','SEDITON SYRUP GREEN BOTTLE','General',2.00,2.00,'Box',1,0,'2025-12-29 09:34:56'),('P-1767000895684-515-x9j5n','SEDITON SYRUP YELLOW BOTTLE','SEDITON SYRUP YELLOW BOTTLE','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-516-hw8no','SENSODYNE 100ML TUBE','SENSODYNE 100ML TUBE','General',6.00,7.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-517-kli0v','SENSODYNE 40ML TUBE','SENSODYNE 40ML TUBE','General',4.00,4.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-518-u7etj','SENSODYNE 75ML TUBE','SENSODYNE 75ML TUBE','General',7.00,8.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-519-a97nw','SEPTRIN SYRUP 100ML BOTTLE','SEPTRIN SYRUP 100ML BOTTLE','General',880.00,1.00,'Box',721,0,'2025-12-29 09:34:56'),('P-1767000895684-520-2sct7','SEPTRIN TAB KIJANI','SEPTRIN TAB KIJANI','General',3.00,4.00,'Box',1,0,'2025-12-29 09:34:56'),('P-1767000895684-521-ifyqi','SEPTRIN TAB PKT','SEPTRIN TAB PKT','General',2.00,3.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-522-igai1','SILK','SILK','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-523-n4jvw','SILVER NITRIC PENCIL','SILVER NITRIC PENCIL','General',7.00,8.00,'Box',63,0,'2025-12-29 09:34:56'),('P-1767000895684-524-djr50','SILVERKANT CREAM 15MG TUBE','SILVERKANT CREAM 15MG TUBE','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-525-fybk8','SITCOM CREAM','SITCOM CREAM','General',11.00,13.00,'Box',3,0,'2025-12-29 09:34:56'),('P-1767000895684-526-0xctr','SITCOM TABS','SITCOM TABS','General',36.00,48.00,'Box',19,0,'2025-12-29 09:34:56'),('P-1767000895684-527-8so1x','SKDERM CREAM 15G  TUBE','SKDERM CREAM 15G  TUBE','General',1.00,2.00,'Box',324,0,'2025-12-29 09:34:56'),('P-1767000895684-528-refeh','SKDERM CREAM 30G TUBE','SKDERM CREAM 30G TUBE','General',2.00,2.00,'Box',949,0,'2025-12-29 09:34:56'),('P-1767000895684-529-3x9jv','SKTONE 100MLS BOTTLE','SKTONE 100MLS BOTTLE','General',1.00,2.00,'Box',7,0,'2025-12-29 09:34:56'),('P-1767000895684-530-rg0wu','SKTONE 200ML BOTTLE','SKTONE 200ML BOTTLE','General',3.00,3.00,'Box',109,0,'2025-12-29 09:34:56'),('P-1767000895684-531-cvxl1','SODIUM CROMOGLYCATE EYE DROP','SODIUM CROMOGLYCATE EYE DROP','General',1.00,1.00,'Box',159,0,'2025-12-29 09:34:56'),('P-1767000895684-532-isf9y','SOFT CARE NDOGO','SOFT CARE NDOGO','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-533-rp1tu','SOFTCARE PAD KUBWA','SOFTCARE PAD KUBWA','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-534-uq4pz','SONADERM CREAM 10G TUBE','SONADERM CREAM 10G TUBE','General',2.00,2.00,'Box',86,0,'2025-12-29 09:34:56'),('P-1767000895684-535-7am3a','SPIRIT 1 Lt','SPIRIT 1 Lt','General',3.00,3.00,'Box',23,0,'2025-12-29 09:34:56'),('P-1767000895684-536-r32zx','SPIRIT 500mls','SPIRIT 500mls','General',2.00,2.00,'Box',130,0,'2025-12-29 09:34:56'),('P-1767000895684-537-52c8w','SPIRIT 5LT','SPIRIT 5LT','General',13.00,23.00,'Box',14,0,'2025-12-29 09:34:56'),('P-1767000895684-538-embzu','SPIRONOLACTONE TAB 25MG','SPIRONOLACTONE TAB 25MG','General',5.00,7.00,'Box',4,0,'2025-12-29 09:34:56'),('P-1767000895684-539-pjh80','SULPHADAR TABS 3s PKT','SULPHADAR TABS 3s PKT','General',759.81,850.00,'Box',7,0,'2025-12-29 09:34:56'),('P-1767000895684-540-so5fy','SULPHUR OINTMENT TUBE','SULPHUR OINTMENT TUBE','General',853.56,1.00,'Box',117,0,'2025-12-29 09:34:56'),('P-1767000895684-541-lke82','SURGICAL BLADES 24G','SURGICAL BLADES 24G','General',10.00,14.00,'Box',3,0,'2025-12-29 09:34:56'),('P-1767000895684-542-fwsbv','SYRINGE 10CC','SYRINGE 10CC','General',140.00,170.00,'Box',49,0,'2025-12-29 09:34:56'),('P-1767000895684-543-ucnas','SYRINGE 20 cc','SYRINGE 20 cc','General',465.00,550.00,'Box',140,0,'2025-12-29 09:34:56'),('P-1767000895684-544-kpw7d','SYRINGE 2CC','SYRINGE 2CC','General',85.00,100.00,'Box',80,0,'2025-12-29 09:34:56'),('P-1767000895684-545-l3ox5','SYRINGE 50ML FEEDING','SYRINGE 50ML FEEDING','General',490.00,600.00,'Box',63,0,'2025-12-29 09:34:56'),('P-1767000895684-546-hxww1','SYRINGE 5CC','SYRINGE 5CC','General',50.00,100.00,'Box',18,0,'2025-12-29 09:34:56'),('P-1767000895684-547-9dbbe','TAMSULOSINE TAB','TAMSULOSINE TAB','General',8.00,11.00,'Box',233,0,'2025-12-29 09:34:56'),('P-1767000895684-548-3m4i1','TASOL GM','TASOL GM','General',3.00,1.00,'Box',46,0,'2025-12-29 09:34:56'),('P-1767000895684-549-fu60v','TELMISARTAN-H TABS 80MG 30\'S','TELMISARTAN-H TABS 80MG 30\'S','General',8.00,9.00,'Box',13,0,'2025-12-29 09:34:56'),('P-1767000895684-550-bhxri','TELMISARTAN TABS 40MG 30\'S','TELMISARTAN TABS 40MG 30\'S','General',6.00,8.00,'Box',66,0,'2025-12-29 09:34:56'),('P-1767000895684-551-ks10y','TELMISARTAN TABS 80MG','TELMISARTAN TABS 80MG','General',7.00,8.00,'Box',57,0,'2025-12-29 09:34:56'),('P-1767000895684-552-z85hq','TERBINAFINE CREAM TUBE','TERBINAFINE CREAM TUBE','General',1.00,2.00,'Box',409,0,'2025-12-29 09:34:56'),('P-1767000895684-553-zt5di','TERMIDOL SYRUP','TERMIDOL SYRUP','General',1.00,2.00,'Box',142,0,'2025-12-29 09:34:56'),('P-1767000895684-554-ghvj6','TETMOSOL SOAP 100G','TETMOSOL SOAP 100G','General',1.00,1.00,'Box',328,0,'2025-12-29 09:34:56'),('P-1767000895684-555-ad7dv','TETMOSOL SOAP 75G','TETMOSOL SOAP 75G','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-556-f19mn','TETRACYCLINE CAP','TETRACYCLINE CAP','General',5.00,7.00,'Box',219,0,'2025-12-29 09:34:56'),('P-1767000895684-557-6n9uy','TETRACYCLINE EYE OINTMENT TUBE','TETRACYCLINE EYE OINTMENT TUBE','General',650.00,750.00,'Box',1,0,'2025-12-29 09:34:56'),('P-1767000895684-558-t67tn','TETRACYCLINE SKIN OINTMENT TUBE','TETRACYCLINE SKIN OINTMENT TUBE','General',607.12,900.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-559-vdpiz','TIMOLOL EYE DROP','TIMOLOL EYE DROP','General',1.00,2.00,'Box',296,0,'2025-12-29 09:34:56'),('P-1767000895684-560-713qe','TINIDAZOLE TABS 4S PACKET','TINIDAZOLE TABS 4S PACKET','General',252.67,400.00,'Box',3,0,'2025-12-29 09:34:56'),('P-1767000895684-561-1nhhx','TIZANIDINE TABS','TIZANIDINE TABS','General',4.00,5.00,'Box',7,0,'2025-12-29 09:34:56'),('P-1767000895684-562-dn2vh','TOFFPLUS CAPS 20s PACKET','TOFFPLUS CAPS 20s PACKET','General',3.00,4.00,'Box',47,0,'2025-12-29 09:34:56'),('P-1767000895684-563-pf54g','TOSSIL','TOSSIL','General',1.00,1.00,'Box',140,0,'2025-12-29 09:34:56'),('P-1767000895684-564-fbibi','TOTOLYN SYRUP','TOTOLYN SYRUP','General',1.00,1.00,'Box',204,0,'2025-12-29 09:34:56'),('P-1767000895684-565-ipup9','TRAMADOL CAP','TRAMADOL CAP','General',4.00,5.00,'Box',93,0,'2025-12-29 09:34:56'),('P-1767000895684-566-qb574','TRAMADOL INJ','TRAMADOL INJ','General',858.26,1.00,'Box',511,0,'2025-12-29 09:34:56'),('P-1767000895684-567-04nl9','TRANEXAMIC ACID INJ','TRANEXAMIC ACID INJ','General',1.00,1.00,'Box',50,0,'2025-12-29 09:34:56'),('P-1767000895684-568-311mb','TRANEXAMIC ACID TABS','TRANEXAMIC ACID TABS','General',5.00,7.00,'Box',59,0,'2025-12-29 09:34:56'),('P-1767000895684-569-1yy1i','TRIAMCINOLONE INJECTION','TRIAMCINOLONE INJECTION','General',2.00,3.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-570-67tl7','TRUSTLY /FLEX P/ FAMILIA COC TA','TRUSTLY /FLEX P/ FAMILIA COC TA','General',655.89,900.00,'Box',186,0,'2025-12-29 09:34:56'),('P-1767000895684-571-hn1uq','UPT PACKET','UPT PACKET','General',93.78,150.00,'Box',18,0,'2025-12-29 09:34:56'),('P-1767000895684-572-tfk1o','URINE BAG','URINE BAG','General',550.00,750.00,'Box',230,0,'2025-12-29 09:34:56'),('P-1767000895684-573-sx8a9','VASELINE JELLY 95MLS','VASELINE JELLY 95MLS','General',2.00,3.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-574-knqon','VASOGRAIN TAB','VASOGRAIN TAB','General',4.00,5.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-575-b8q50','VICRY NO. 2','VICRY NO. 2','General',2.00,2.00,'Box',52,0,'2025-12-29 09:34:56'),('P-1767000895684-576-huhgg','VIGOMAX FORTE TAB','VIGOMAX FORTE TAB','General',8.00,11.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-577-rqssd','VIGOR DOCTOR  100G','VIGOR DOCTOR  100G','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-578-qbeog','VIRUTUBISHO','VIRUTUBISHO','General',0.00,4.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-579-gjp8y','VISKING HERBAL SYRUP','VISKING HERBAL SYRUP','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-580-u2zng','VISKING LOZENGES','VISKING LOZENGES','General',15.00,17.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-581-a71n3','VISKING RUBB KUBWA 25G','VISKING RUBB KUBWA 25G','General',666.00,800.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-582-iq6ha','VISKING RUBB NDOGO 4GM','VISKING RUBB NDOGO 4GM','General',167.00,250.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-583-cdgo2','VITAMIN B INJECTION','VITAMIN B INJECTION','General',1.00,1.00,'Box',8,0,'2025-12-29 09:34:56'),('P-1767000895684-584-7swrl','VITAMIN B SYRUP 100ML BOTTLE','VITAMIN B SYRUP 100ML BOTTLE','General',950.00,1.00,'Box',7,0,'2025-12-29 09:34:56'),('P-1767000895684-585-3fzzy','VITAMIN B TAB BLISTER','VITAMIN B TAB BLISTER','General',1.00,1.00,'Box',296,0,'2025-12-29 09:34:56'),('P-1767000895684-586-ivzbv','VITAMIN C TAB BLISTER','VITAMIN C TAB BLISTER','General',6.00,9.00,'Box',143,0,'2025-12-29 09:34:56'),('P-1767000895684-587-4hrjr','VITAMIN D3 5000IU','VITAMIN D3 5000IU','General',4.00,8.00,'Box',6,0,'2025-12-29 09:34:56'),('P-1767000895684-588-hxkz8','VITAMIN K INJECTION.','VITAMIN K INJECTION.','General',4.00,6.00,'Box',46,0,'2025-12-29 09:34:56'),('P-1767000895684-589-cfay2','VIVIAN GEL TUBE','VIVIAN GEL TUBE','General',3.00,3.00,'Box',99,0,'2025-12-29 09:34:56'),('P-1767000895684-590-w6gwp','VIVIAN PLUS TAB PKT','VIVIAN PLUS TAB PKT','General',6.00,7.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-591-ri9qt','VOLIN GEL TUBE','VOLIN GEL TUBE','General',1.00,3.00,'Box',65,0,'2025-12-29 09:34:56'),('P-1767000895684-592-gqru5','VOMIDOXINE TAB','VOMIDOXINE TAB','General',2.00,2.00,'Box',25,0,'2025-12-29 09:34:56'),('P-1767000895684-593-dg7gy','WATER FOR INJ 10ML VIAL','WATER FOR INJ 10ML VIAL','General',71.40,100.00,'Box',1,0,'2025-12-29 09:34:56'),('P-1767000895684-594-qnwem','WATER GUARD TAB','WATER GUARD TAB','General',0.00,6.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-595-5ylbm','WHITEFIELD KOPO','WHITEFIELD KOPO','General',650.00,750.00,'Box',15,0,'2025-12-29 09:34:56'),('P-1767000895684-596-bckvz','WHITEFIELD OINTMENT TUBE','WHITEFIELD OINTMENT TUBE','General',598.32,750.00,'Box',361,0,'2025-12-29 09:34:56'),('P-1767000895684-597-3hoas','XYLOMETAZOLINE NASAL DROPS','XYLOMETAZOLINE NASAL DROPS','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-598-dfjdt','ZECUF LOZENGES 2s','ZECUF LOZENGES 2s','General',2.00,2.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-599-h92ja','ZECUF SYRUP BOTTLE','ZECUF SYRUP BOTTLE','General',1.00,2.00,'Box',376,0,'2025-12-29 09:34:56'),('P-1767000895684-600-co5h9','ZENDEX TAB','ZENDEX TAB','General',5.00,5.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-601-ekyx7','ZENKOF SYRUP BOTTLE','ZENKOF SYRUP BOTTLE','General',2.00,2.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-602-scsuq','ZENTEL SYRUP','ZENTEL SYRUP','General',4.00,4.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-603-1fexh','ZENTEL TAB PACKET','ZENTEL TAB PACKET','General',4.00,5.00,'Box',65,0,'2025-12-29 09:34:56'),('P-1767000895684-604-qpflu','ZENTUSS SYRUP 100ML BOTTLE','ZENTUSS SYRUP 100ML BOTTLE','General',1.00,2.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-605-lob38','ZENYLIN SYRUP BOTTLE','ZENYLIN SYRUP BOTTLE','General',2.00,2.00,'Box',109,0,'2025-12-29 09:34:56'),('P-1767000895684-606-fqllg','ZOA ZOA NDOGO','ZOA ZOA NDOGO','General',500.00,550.00,'Box',10,0,'2025-12-29 09:34:56'),('P-1767000895684-607-t9bub','ZOAZOA SOAP','ZOAZOA SOAP','General',1.00,1.00,'Box',10,0,'2025-12-29 09:34:56');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `requisition_approvers`
--

DROP TABLE IF EXISTS `requisition_approvers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `requisition_approvers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `requisition_id` varchar(50) NOT NULL,
  `approver_id` varchar(50) NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  `comments` text DEFAULT NULL,
  `responded_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `requisition_id` (`requisition_id`),
  KEY `approver_id` (`approver_id`),
  CONSTRAINT `requisition_approvers_ibfk_1` FOREIGN KEY (`requisition_id`) REFERENCES `stock_requisitions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `requisition_approvers_ibfk_2` FOREIGN KEY (`approver_id`) REFERENCES `staff` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `requisition_approvers`
--

LOCK TABLES `requisition_approvers` WRITE;
/*!40000 ALTER TABLE `requisition_approvers` DISABLE KEYS */;
/*!40000 ALTER TABLE `requisition_approvers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sale_items`
--

DROP TABLE IF EXISTS `sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sale_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sale_id` varchar(50) DEFAULT NULL,
  `product_id` varchar(50) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `batch_number` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sale_id` (`sale_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`),
  CONSTRAINT `sale_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_items`
--

LOCK TABLES `sale_items` WRITE;
/*!40000 ALTER TABLE `sale_items` DISABLE KEYS */;
INSERT INTO `sale_items` VALUES (23,'SALE-INV-1767001273203-in2cxsbj1','P-1767000895682-2-92vjp',3400,550.00,490.00,'BATCH-AUTO'),(24,'SALE-INV-1767177367992-e6jrdbdz8','P-1767000895682-2-92vjp',1,550.00,490.00,'BATCH-AUTO'),(25,'SALE-INV-1767177496817-vwf87ddmz','P-1767000895682-2-92vjp',2998,550.00,490.00,'BATCH-AUTO'),(26,'SALE-INV-1767184574408-1gam5fukf','P-1767000895682-0-5j37p',1,55.00,22.00,'BATCH-AUTO'),(27,'SALE-INV-1767186693432-dp1841et9','P-1767000895682-0-5j37p',1,55.00,22.00,'BATCH-AUTO'),(28,'SALE-INV-1767187267416-iupz04uqr','P-1767000895682-0-5j37p',1,55.00,22.00,'BATCH-AUTO'),(29,'SALE-INV-1767193014687-ckflzlor3','P-1767000895682-3-hnawl',1,8.00,6.00,'BATCH-AUTO'),(30,'SALE-INV-1767193014687-ckflzlor3','P-1767000895682-4-yrm2o',1,3.00,2.00,'BATCH-AUTO'),(31,'SALE-INV-1767193014687-ckflzlor3','P-1767000895682-0-5j37p',1,55.00,22.00,'BATCH-AUTO'),(32,'SALE-INV-1767189827455-r1f6srkw3','P-1767000895682-0-5j37p',1,55.00,22.00,'BATCH-AUTO'),(33,'SALE-INV-1767189827455-r1f6srkw3','P-1767000895682-3-hnawl',178,8.00,6.00,'BATCH-AUTO'),(34,'SALE-INV-1767189827455-r1f6srkw3','P-1767000895682-5-s3q94',189,3.00,2.00,'BATCH-AUTO'),(35,'SALE-INV-1767189827455-r1f6srkw3','P-1767000895682-4-yrm2o',176,3.00,2.00,'BATCH-AUTO'),(36,'SALE-INV-1767195827402-uhr98ve2w','P-1767000895682-0-5j37p',1,55.00,22.00,'BATCH-AUTO'),(37,'SALE-INV-1767195827402-uhr98ve2w','P-1767000895682-2-92vjp',95,550.00,490.00,'BATCH-AUTO'),(38,'SALE-INV-1767195827402-uhr98ve2w','P-1767000895682-3-hnawl',1,8.00,6.00,'BATCH-AUTO'),(39,'SALE-INV-1767195827402-uhr98ve2w','P-1767000895682-5-s3q94',10,3.00,2.00,'BATCH-AUTO'),(40,'SALE-INV-1767197388698-i8elbrgsy','P-1767000895682-0-5j37p',701,55.00,22.00,'BATCH-AUTO'),(41,'SALE-INV-1767197388698-i8elbrgsy','P-1767000895682-2-92vjp',1,550.00,490.00,'BATCH-AUTO'),(42,'SALE-INV-1767197388698-i8elbrgsy','P-1767000895682-3-hnawl',1,8.00,6.00,'BATCH-AUTO'),(43,'SALE-INV-1767197388698-i8elbrgsy','P-1767000895682-4-yrm2o',1,3.00,2.00,'BATCH-AUTO'),(44,'SALE-INV-1767197388698-i8elbrgsy','P-1767000895682-5-s3q94',1,3.00,2.00,'BATCH-AUTO'),(45,'SALE-INV-1767198450525-oi92u1ry3','P-1767000895682-0-5j37p',1000,55.00,22.00,'BATCH-AUTO'),(46,'SALE-INV-1767198450525-oi92u1ry3','P-1767000895682-2-92vjp',1001,550.00,490.00,'BATCH-AUTO'),(47,'SALE-INV-1767198450525-oi92u1ry3','P-1767000895682-3-hnawl',1000,8.00,6.00,'BATCH-AUTO'),(48,'SALE-INV-1767198450525-oi92u1ry3','P-1767000895682-5-s3q94',1,3.00,2.00,'BATCH-AUTO'),(49,'SALE-INV-1767198450525-oi92u1ry3','P-1767000895682-4-yrm2o',1,3.00,2.00,'BATCH-AUTO'),(50,'SALE-INV-MP-2025-86480','P-1767000895682-0-5j37p',1000,55.00,22.00,'BATCH-AUTO'),(51,'SALE-INV-MP-2025-86480','P-1767000895682-2-92vjp',1000,550.00,490.00,'BATCH-AUTO'),(52,'SALE-INV-MP-2025-86480','P-1767000895682-3-hnawl',1,8.00,6.00,'BATCH-AUTO'),(53,'SALE-INV-MP-2025-86480','P-1767000895682-4-yrm2o',1,3.00,2.00,'BATCH-AUTO'),(54,'SALE-INV-MP-2025-86480','P-1767000895682-5-s3q94',1,3.00,2.00,'BATCH-AUTO'),(55,'SALE-INV-MP-2025-29406','P-1767000895682-0-5j37p',101,55.00,22.00,'BATCH-AUTO'),(56,'SALE-INV-MP-2025-29406','P-1767000895682-4-yrm2o',1000,3.00,2.00,'BATCH-AUTO'),(57,'SALE-INV-MP-2025-29406','P-1767000895682-5-s3q94',1,3.00,2.00,'BATCH-AUTO'),(58,'SALE-INV-MP-2025-29406','P-1767000895682-2-92vjp',1,550.00,490.00,'BATCH-AUTO'),(59,'SALE-INV-MP-2025-99917','P-1767000895682-2-92vjp',1,550.00,490.00,'BATCH-AUTO'),(60,'SALE-INV-MP-2025-99917','P-1767000895682-3-hnawl',1,8.00,6.00,'BATCH-AUTO'),(61,'SALE-INV-MP-2025-99917','P-1767000895682-4-yrm2o',1,3.00,2.00,'BATCH-AUTO'),(62,'SALE-INV-MP-2025-99917','P-1767000895682-5-s3q94',1,3.00,2.00,'BATCH-AUTO'),(63,'SALE-INV-MP-2025-99917','P-1767000895682-0-5j37p',1,55.00,22.00,'BATCH-AUTO'),(64,'SALE-INV-MP-2025-26710','P-1767000895682-3-hnawl',1,8.00,6.00,'BATCH-AUTO'),(65,'SALE-INV-MP-2025-05051','P-1767000895682-2-92vjp',1,550.00,490.00,'BATCH-AUTO'),(66,'SALE-INV-MP-2025-05051','P-1767000895682-3-hnawl',1,8.00,6.00,'BATCH-AUTO'),(67,'SALE-INV-MP-2025-05051','P-1767000895682-4-yrm2o',1,3.00,2.00,'BATCH-AUTO'),(68,'SALE-INV-MP-2025-19070','P-1767000895682-2-92vjp',7,550.00,490.00,'BATCH-AUTO'),(69,'SALE-INV-MP-2025-19070','P-1767000895682-0-5j37p',5,55.00,22.00,'BATCH-AUTO'),(70,'SALE-INV-MP-2025-19070','P-1767000895682-3-hnawl',3,8.00,6.00,'BATCH-AUTO'),(71,'SALE-INV-MP-2025-19070','P-1767000895682-4-yrm2o',3,3.00,2.00,'BATCH-AUTO'),(72,'SALE-INV-MP-2025-19070','P-1767000895682-5-s3q94',4,3.00,2.00,'BATCH-AUTO'),(73,'SALE-INV-MP-2026-43942','P-1767000895682-2-92vjp',1,550.00,490.00,'BATCH-AUTO'),(74,'SALE-INV-MP-2026-43942','P-1767000895682-1-wzpx0',1,7.00,2.00,'BATCH-AUTO'),(75,'SALE-INV-MP-2026-43942','P-1767000895682-0-5j37p',1,55.00,22.00,'BATCH-AUTO'),(76,'SALE-INV-MP-2026-51237','P-1767000895682-0-5j37p',1001,55.00,22.00,'BATCH-AUTO'),(77,'SALE-INV-MP-2026-51237','P-1767000895682-3-hnawl',1,8.00,6.00,'BATCH-AUTO'),(78,'SALE-INV-MP-2026-30341','P-1767000895682-3-hnawl',1,8.00,6.00,'BATCH-AUTO'),(79,'SALE-INV-MP-2026-72190','P-1767000895682-3-hnawl',1,8.00,6.00,'BATCH-AUTO'),(80,'SALE-INV-MP-2026-39263','P-1767000895682-0-5j37p',100,55.00,22.00,'BATCH-AUTO'),(81,'SALE-INV-MP-2026-28194','P-1767000895682-0-5j37p',100,55.00,22.00,'BATCH-AUTO'),(82,'SALE-INV-MP-2026-28194','P-1767000895682-3-hnawl',1000,8.00,6.00,'BATCH-AUTO'),(83,'SALE-INV-MP-2026-09789','P-1767000895682-3-hnawl',1000,8.00,6.00,'BATCH-AUTO');
/*!40000 ALTER TABLE `sale_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `profit` decimal(10,2) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sales_branch` (`branch_id`),
  KEY `idx_sales_date` (`created_at`),
  CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
INSERT INTO `sales` VALUES ('SALE-INV-1767001273203-in2cxsbj1','BR002',2206600.00,540600.00,'CASH','jhgfh','2025-12-29 09:42:25'),('SALE-INV-1767177367992-e6jrdbdz8','BR002',550.00,60.00,'CASH','ddd','2025-12-31 10:36:44'),('SALE-INV-1767177496817-vwf87ddmz','BR002',1648900.00,179880.00,'CASH','sdj','2025-12-31 10:38:26'),('SALE-INV-1767184574408-1gam5fukf','BR003',55.00,33.00,'CASH','ER','2025-12-31 12:36:28'),('SALE-INV-1767186693432-dp1841et9','BR003',55.00,33.00,'CASH','er','2025-12-31 13:12:04'),('SALE-INV-1767187267416-iupz04uqr','BR003',55.00,33.00,'CASH','er','2025-12-31 13:21:18'),('SALE-INV-1767189827455-r1f6srkw3','BR003',2574.00,754.00,'CASH','vanadizy, 12345','2025-12-31 15:04:29'),('SALE-INV-1767193014687-ckflzlor3','BR003',66.00,36.00,'CASH','dopa','2025-12-31 14:57:06'),('SALE-INV-1767195827402-uhr98ve2w','BR003',52343.00,5745.00,'CASH','johnson','2025-12-31 15:44:16'),('SALE-INV-1767197388698-i8elbrgsy','BR003',39119.00,23197.00,'CASH','hassan','2025-12-31 16:10:26'),('SALE-INV-1767198450525-oi92u1ry3','BR003',613556.00,95062.00,'CASH','hamad','2025-12-31 16:27:47'),('SALE-INV-MP-2025-05051','BR003',561.00,63.00,'CASH','hang out','2025-12-31 20:34:46'),('SALE-INV-MP-2025-19070','BR003',4170.00,598.00,'CASH','munishi','2025-12-31 20:49:08'),('SALE-INV-MP-2025-26710','BR003',8.00,2.00,'CASH','new','2025-12-31 20:33:38'),('SALE-INV-MP-2025-29406','BR003',9108.00,4394.00,'CASH','madam','2025-12-31 16:59:49'),('SALE-INV-MP-2025-86480','BR003',605014.00,93004.00,'CASH','mussa','2025-12-31 16:46:44'),('SALE-INV-MP-2025-99917','BR003',619.00,97.00,'CASH','weed master','2025-12-31 20:28:49'),('SALE-INV-MP-2026-09789','BR002',8000.00,2000.00,'CASH','kaka yao','2025-12-31 23:48:58'),('SALE-INV-MP-2026-28194','BR002',13500.00,5300.00,'CASH','never','2025-12-31 23:47:11'),('SALE-INV-MP-2026-30341','BR002',8.00,2.00,'CASH','james','2025-12-31 23:21:08'),('SALE-INV-MP-2026-39263','BR002',5500.00,3300.00,'CASH','neema','2025-12-31 23:44:56'),('SALE-INV-MP-2026-43942','BR002',612.00,98.00,'CASH','kache john','2025-12-31 22:28:34'),('SALE-INV-MP-2026-51237','BR002',55063.00,33035.00,'CASH','asuman','2025-12-31 22:55:30'),('SALE-INV-MP-2026-72190','BR002',8.00,2.00,'CASH','sosoma','2025-12-31 23:31:48');
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipment_approvers`
--

DROP TABLE IF EXISTS `shipment_approvers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shipment_approvers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shipment_id` varchar(50) DEFAULT NULL,
  `approver_id` varchar(50) DEFAULT NULL,
  `role` varchar(50) NOT NULL,
  `notified_at` timestamp NULL DEFAULT NULL,
  `responded_at` timestamp NULL DEFAULT NULL,
  `response` enum('APPROVED','REJECTED','PENDING') DEFAULT 'PENDING',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_shipment_approver` (`shipment_id`,`approver_id`),
  KEY `approver_id` (`approver_id`),
  CONSTRAINT `shipment_approvers_ibfk_1` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`),
  CONSTRAINT `shipment_approvers_ibfk_2` FOREIGN KEY (`approver_id`) REFERENCES `staff` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipment_approvers`
--

LOCK TABLES `shipment_approvers` WRITE;
/*!40000 ALTER TABLE `shipment_approvers` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipment_approvers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipments`
--

DROP TABLE IF EXISTS `shipments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shipments` (
  `id` varchar(50) NOT NULL,
  `transfer_id` varchar(50) DEFAULT NULL,
  `from_branch_id` varchar(50) DEFAULT NULL,
  `to_branch_id` varchar(50) DEFAULT NULL,
  `status` enum('PENDING','STORE_KEEPER_VERIFIED','APPROVED','REJECTED','IN_TRANSIT','DELIVERED') DEFAULT 'PENDING',
  `verification_code` varchar(10) DEFAULT NULL,
  `total_value` decimal(10,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `approved_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `approved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `verification_code` (`verification_code`),
  KEY `transfer_id` (`transfer_id`),
  KEY `from_branch_id` (`from_branch_id`),
  KEY `to_branch_id` (`to_branch_id`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `shipments_ibfk_1` FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers` (`id`),
  CONSTRAINT `shipments_ibfk_2` FOREIGN KEY (`from_branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `shipments_ibfk_3` FOREIGN KEY (`to_branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `shipments_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `staff` (`id`),
  CONSTRAINT `shipments_ibfk_5` FOREIGN KEY (`approved_by`) REFERENCES `staff` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipments`
--

LOCK TABLES `shipments` WRITE;
/*!40000 ALTER TABLE `shipments` DISABLE KEYS */;
INSERT INTO `shipments` VALUES ('SHIP-1767000975','TRANSFER-1767000975','BR003','BR002','PENDING',NULL,0.00,'','ADMIN-001',NULL,'2025-12-29 09:36:15',NULL),('SHIP-1767221254','TRANSFER-1767221254','BR003','BR002','PENDING',NULL,0.00,'','ADMIN-001',NULL,'2025-12-31 22:47:34',NULL);
/*!40000 ALTER TABLE `shipments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` enum('SUPER_ADMIN','BRANCH_MANAGER','ACCOUNTANT','INVENTORY_CONTROLLER','PHARMACIST','DISPENSER','STOREKEEPER') DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `username` varchar(100) NOT NULL,
  `password_hash` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_staff_username` (`username`),
  KEY `idx_staff_branch` (`branch_id`),
  CONSTRAINT `staff_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
INSERT INTO `staff` VALUES ('ADMIN-001','System Administrator','SUPER_ADMIN','BR003',NULL,NULL,'ACTIVE','admin','$2y$10$.kJk4I3oKIy7rxo5IKcmrePl4R82CxUQdZNVF/ONM18fZNoprFWwi','2025-12-16 16:07:44','2025-12-31 16:09:05'),('ST-1766414748420','jaden','INVENTORY_CONTROLLER','BR007','jaden@gmail.com','+2456809876','ACTIVE','jaden','$2y$10$49.lu/IU2JcuUOHWtbkTJ.5PGjRlahtjC8M/LGoE/FzQefD0L4gg6','2025-12-22 14:45:49','2025-12-26 12:09:54'),('ST-1766415921685','rasul','STOREKEEPER','BR002','rasul@gmail.com','+3456783456','ACTIVE','rasul','$2y$10$3rK18Dba7saQxaiNXSmvl.xGQqCUWuhRRR.Bn2oC4SZDwjp0s2woa','2025-12-22 15:05:23','2025-12-31 23:42:47'),('ST-1766416049122','john','DISPENSER','BR005','john@gmail.com','+234567822','ACTIVE','john','$2y$10$OQdxJPdW9/xqCZC/zQB92e.z3Ppx8pQNxLdhRw6yQ/miMACODmtC6','2025-12-22 15:07:29','2025-12-22 15:08:46'),('ST-1766417527098','diana','INVENTORY_CONTROLLER','BR002','diana@gmail.com','+25566546784','ACTIVE','diana','$2y$10$PTK5PJI7hHB7/1BZn4y0O./Bvq4MRLqyaHiU88THkfWeTKYeEBecO','2025-12-22 15:32:07','2025-12-31 23:39:24'),('ST-1766417750243','anna','ACCOUNTANT','BR002','','','ACTIVE','anna','$2y$10$tJaI3ETtuJ5ViXKsCXp/WOUJwHP1njqz/K/FIIU9YWBlZ3RC.JXQe','2025-12-22 15:35:50','2025-12-31 23:40:13'),('ST-1766418724156','rosemary','INVENTORY_CONTROLLER','HEAD_OFFICE','rosemary@gmail.com','+255344377','ACTIVE','rosemary','$2y$10$epk4si5eBHizFIH7SEAHXOlNOo3kM12hzrkBWJr4W1ZkL8ejVEVsG','2025-12-22 15:52:05',NULL),('ST-1766420586934','PAULO IDDI','BRANCH_MANAGER','BR003','pauloiddi@pms.co.tz','+255 762 399 731','ACTIVE','paulo_iddI','$2y$10$Rp8isWK16ABXeF2Cyni71eGZ4KiQKUUQFX43OEbupdrzmyWVGj0P2','2025-12-22 16:23:11','2025-12-22 16:54:17'),('ST-1766420992720','SAULO BURTON','PHARMACIST','BR003','sauloburton@pms.co.tz','+255 757 925 439','ACTIVE','sauloburton','$2y$10$Kt8nqgiQTh9iM3812iI6X.VscNfI1NKPIyaD1rjPwr6xmvrpTSwhG','2025-12-22 16:29:56',NULL),('ST-1766421883505','ISAYA PAUL','STOREKEEPER','BR003','isayapaul@pms.co.tz','+255 782 734 145','ACTIVE','isaya_paul','$2y$10$jezrnNHzLLCEQfTg7RynHOv7NFpEROr7xqfeGLuoElmJstDbQEALC','2025-12-22 16:44:47',NULL),('ST-1766422363512','AIKA JIDEGA','STOREKEEPER','BR003','aikajidega@pms.co.tz','+255 759 672 542','ACTIVE','aikajidega','$2y$10$7qbmqV2UCts0rnXhNUh0U.cN3w.HbP6LwOpNs.c0lflRbFFvdntYi','2025-12-22 16:52:47',NULL),('ST-1766424156482','SALMIN MIKIDAD','DISPENSER','BR002','salminmikidad@pms.co.tz','+255 719 050 805','ACTIVE','salmin_mikidad','$2y$10$XAehoNnxnJCJtAO0Jye5v.7/BYTcuP7pVpOJhRF0dUpXMSZ95owwK','2025-12-22 17:22:40',NULL),('ST-1766479861631','JOHN MAISHA','PHARMACIST','BR004','johm.maisha@pms.co.tz','+255 672 654 237','ACTIVE','johnmaisha','$2y$10$Ax6iAhqgU379IYDPqAgO4OJIZRNIMp6riQke6wb5N9eGHH83rcqLi','2025-12-23 08:51:03',NULL),('ST-1766481424251','IBRAHIM JUNGA','DISPENSER','BR007','ibrahimjunga@pms.co.tz','+255 620 823 829','ACTIVE','ibrahim.junga','$2y$10$tBndmDHEFvr5kNrV5CBlJemazDZG8stUyJM2lvhJs8l1WNtCo01iq','2025-12-23 09:17:05',NULL),('ST-1766566046864','kache','DISPENSER','BR002','kache@gmail.com','+234567899','ACTIVE','kache','$2y$10$/VkaasKGrK5reaMK87OHKuQ5dmXGm7RyBI5zNvyeZ6yRgx5VYBHqS','2025-12-24 08:47:26','2025-12-31 23:44:08'),('ST-1766750637668','GODFREY MALENYA','SUPER_ADMIN','BR003','godfreymalenya@gmail.com','+255','ACTIVE','malenya','$2y$10$Wg2ieTSI8oRxf81zuUYsReMZ0KZDQtviMRRTMoBjSZRDm.lj4g196','2025-12-26 12:03:55','2025-12-28 15:26:04');
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_requisition_items`
--

DROP TABLE IF EXISTS `stock_requisition_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_requisition_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `requisition_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `quantity_requested` int(11) NOT NULL,
  `quantity_approved` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `requisition_id` (`requisition_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `stock_requisition_items_ibfk_1` FOREIGN KEY (`requisition_id`) REFERENCES `stock_requisitions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_requisition_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_requisition_items`
--

LOCK TABLES `stock_requisition_items` WRITE;
/*!40000 ALTER TABLE `stock_requisition_items` DISABLE KEYS */;
INSERT INTO `stock_requisition_items` VALUES (33,'REQ-1767000963','P-1767000895682-1-wzpx0',80,NULL,'Current stock: 0 Box','2025-12-29 09:36:03'),(34,'REQ-1767220922','P-1767000895682-0-5j37p',2000,NULL,'Current stock: 0 Box','2025-12-31 22:42:02');
/*!40000 ALTER TABLE `stock_requisition_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_requisitions`
--

DROP TABLE IF EXISTS `stock_requisitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_requisitions` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `requested_by` varchar(50) NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','FULFILLED') DEFAULT 'PENDING',
  `total_items` int(11) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `priority` enum('LOW','NORMAL','HIGH','URGENT') DEFAULT 'NORMAL',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `approved_by` varchar(50) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `requested_by` (`requested_by`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `stock_requisitions_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `stock_requisitions_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `staff` (`id`),
  CONSTRAINT `stock_requisitions_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `staff` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_requisitions`
--

LOCK TABLES `stock_requisitions` WRITE;
/*!40000 ALTER TABLE `stock_requisitions` DISABLE KEYS */;
INSERT INTO `stock_requisitions` VALUES ('REQ-1767000963','BR002','ST-1766417527098','APPROVED',1,'Stock requisition with 1 items','URGENT','2025-12-29 09:36:03','2025-12-29 09:36:15','ADMIN-001','2025-12-29 09:36:15'),('REQ-1767220922','BR002','ST-1766417527098','APPROVED',1,'Stock requisition with 1 items','URGENT','2025-12-31 22:42:02','2025-12-31 22:47:34','ADMIN-001','2025-12-31 22:47:34');
/*!40000 ALTER TABLE `stock_requisitions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_transfer_items`
--

DROP TABLE IF EXISTS `stock_transfer_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_transfer_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transfer_id` varchar(50) DEFAULT NULL,
  `product_id` varchar(50) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `batch_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `transfer_id` (`transfer_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `stock_transfer_items_ibfk_1` FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers` (`id`),
  CONSTRAINT `stock_transfer_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_transfer_items`
--

LOCK TABLES `stock_transfer_items` WRITE;
/*!40000 ALTER TABLE `stock_transfer_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_transfer_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_transfers`
--

DROP TABLE IF EXISTS `stock_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_transfers` (
  `id` varchar(50) NOT NULL,
  `from_branch_id` varchar(50) NOT NULL,
  `to_branch_id` varchar(50) NOT NULL,
  `products` text NOT NULL,
  `status` enum('IN_TRANSIT','RECEIVED_KEEPER','COMPLETED','CANCELLED') DEFAULT 'IN_TRANSIT',
  `date_sent` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_received` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `storekeeper_verified` tinyint(1) DEFAULT 0,
  `controller_verified` tinyint(1) DEFAULT 0,
  `storekeeper_verified_by` varchar(50) DEFAULT NULL,
  `controller_verified_by` varchar(50) DEFAULT NULL,
  `storekeeper_verified_at` timestamp NULL DEFAULT NULL,
  `controller_verified_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_transfers_from_branch` (`from_branch_id`),
  KEY `idx_transfers_to_branch` (`to_branch_id`),
  KEY `idx_transfers_status` (`status`),
  KEY `fk_storekeeper_verified_by` (`storekeeper_verified_by`),
  KEY `fk_controller_verified_by` (`controller_verified_by`),
  CONSTRAINT `fk_controller_verified_by` FOREIGN KEY (`controller_verified_by`) REFERENCES `staff` (`id`),
  CONSTRAINT `fk_storekeeper_verified_by` FOREIGN KEY (`storekeeper_verified_by`) REFERENCES `staff` (`id`),
  CONSTRAINT `stock_transfers_ibfk_1` FOREIGN KEY (`from_branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_transfers_ibfk_2` FOREIGN KEY (`to_branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_transfers`
--

LOCK TABLES `stock_transfers` WRITE;
/*!40000 ALTER TABLE `stock_transfers` DISABLE KEYS */;
INSERT INTO `stock_transfers` VALUES ('TRANSFER-1767000959','BR003','BR002','[{\"productId\":\"P-1767000895682-0-5j37p\",\"productName\":\"ABDOMINAL BELT XXL\",\"quantity\":1000,\"batchNumber\":\"BATCH-1767000957772\",\"expiryDate\":\"2025-12-31\"}]','COMPLETED','2025-12-29 09:35:59','2025-12-29 09:38:07','','ADMIN-001','2025-12-29 09:35:59','2025-12-29 09:38:07',0,0,NULL,NULL,NULL,NULL),('TRANSFER-1767000975','BR003','BR002','[{\"productId\":\"P-1767000895682-1-wzpx0\",\"productName\":\"ABITOL TABS 4MG\",\"quantity\":80,\"batchNumber\":\"BATCH-1767000971654-zpx0\",\"expiryDate\":\"2026-12-29\",\"availableStock\":2000}]','COMPLETED','2025-12-29 09:36:15','2025-12-29 09:37:41','','ADMIN-001','2025-12-29 09:36:15','2025-12-29 09:37:41',0,0,NULL,NULL,NULL,NULL),('TRANSFER-1767214517','BR003','BR002','[{\"productId\":\"P-1767000895682-2-92vjp\",\"productName\":\"ACECLOFENAC TABS\",\"quantity\":2000,\"batchNumber\":\"BATCH-1767214505929\",\"expiryDate\":\"2025-12-31\"}]','COMPLETED','2025-12-31 20:55:17','2025-12-31 21:04:35','make all changes','ADMIN-001','2025-12-31 20:55:17','2025-12-31 21:04:35',0,0,NULL,NULL,NULL,NULL),('TRANSFER-1767220567','BR003','BR002','[{\"productId\":\"P-1767000895682-3-hnawl\",\"productName\":\"ACNE FREE TUBE\",\"quantity\":10000,\"batchNumber\":\"BATCH-1767220556167\",\"expiryDate\":\"2025-12-31\"}]','COMPLETED','2025-12-31 22:36:07','2025-12-31 22:38:25','leo ni leo','ADMIN-001','2025-12-31 22:36:07','2025-12-31 22:38:25',0,0,NULL,NULL,NULL,NULL),('TRANSFER-1767221254','BR003','BR002','[{\"productId\":\"P-1767000895682-0-5j37p\",\"productName\":\"ABDOMINAL BELT XXL\",\"quantity\":2000,\"batchNumber\":\"BATCH-1767221241355-j37p\",\"expiryDate\":\"2026-12-31\",\"availableStock\":5186}]','COMPLETED','2025-12-31 22:47:34','2025-12-31 22:50:21','','ADMIN-001','2025-12-31 22:47:34','2025-12-31 22:50:21',0,0,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `stock_transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `system_settings` (
  `id` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` mediumtext DEFAULT NULL,
  `data_type` enum('string','number','boolean','json') DEFAULT 'string',
  `description` text DEFAULT NULL,
  `updated_by` varchar(50) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_category_key` (`category`,`setting_key`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_system_settings_category` (`category`),
  CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `staff` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES ('address','general','address','MPANDA, TANZANIA','string','general address setting',NULL,'2025-12-31 15:07:50'),('apiKey','integrations','apiKey','sk_live_51Mk...90xZ','string','integrations apiKey setting',NULL,'2025-12-31 15:07:50'),('companyName','general','companyName','MALENYA PHARMACEUTICAL COMPANY','string','general companyName setting',NULL,'2025-12-31 15:07:50'),('currency','general','currency','TZS','string','general currency setting',NULL,'2025-12-31 15:07:50'),('dailyReportSms','notifications','dailyReportSms','false','string','notifications dailyReportSms setting',NULL,'2025-12-31 15:07:50'),('email','general','email','malenyapharmacy@gmail.com','string','general email setting',NULL,'2025-12-31 15:07:50'),('emailRecipients','notifications','emailRecipients','admin@pms.co.tz, manager@pms.co.tz','string','notifications emailRecipients setting',NULL,'2025-12-31 15:07:50'),('enforceStrongPasswords','security','enforceStrongPasswords','true','string','security enforceStrongPasswords setting',NULL,'2025-12-31 15:07:50'),('expiryAlertSms','notifications','expiryAlertSms','true','string','notifications expiryAlertSms setting',NULL,'2025-12-31 15:07:50'),('language','general','language','English','string','general language setting',NULL,'2025-12-31 15:07:50'),('logo','general','logo','/backend_php/uploads/logos/logo_1767193560_69553bd83d485.jpeg','string','Company logo setting',NULL,'2025-12-31 15:07:50'),('lowStockEmail','notifications','lowStockEmail','true','string','notifications lowStockEmail setting',NULL,'2025-12-31 15:07:50'),('msdSyncEnabled','integrations','msdSyncEnabled','true','string','integrations msdSyncEnabled setting',NULL,'2025-12-31 15:07:50'),('nhifPortalId','integrations','nhifPortalId','HOSP-001-TZ','string','integrations nhifPortalId setting',NULL,'2025-12-31 15:07:50'),('passwordExpiry','security','passwordExpiry','90','string','security passwordExpiry setting',NULL,'2025-12-31 15:07:50'),('phone','general','phone','+255 700 123 456','string','general phone setting',NULL,'2025-12-31 15:07:50'),('sessionTimeout','security','sessionTimeout','15','string','security sessionTimeout setting',NULL,'2025-12-31 15:07:50'),('smsGateway','integrations','smsGateway','Twilio','string','integrations smsGateway setting',NULL,'2025-12-31 15:07:50'),('systemUpdates','notifications','systemUpdates','true','string','notifications systemUpdates setting',NULL,'2025-12-31 15:07:50'),('timezone','general','timezone','Africa/Dar_es_Salaam','string','general timezone setting',NULL,'2025-12-31 15:07:50'),('tinNumber','general','tinNumber','123-456-789','string','general tinNumber setting',NULL,'2025-12-31 15:07:50'),('traPortalUrl','integrations','traPortalUrl','http://localhost:8080/tra-api/v1','string','integrations traPortalUrl setting',NULL,'2025-12-31 15:07:50'),('twoFactor','security','twoFactor','true','string','security twoFactor setting',NULL,'2025-12-31 15:07:50');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

--
-- Table structure for table `entities`
--

DROP TABLE IF EXISTS `entities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `entities` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('CUSTOMER','SUPPLIER','BOTH') NOT NULL DEFAULT 'CUSTOMER',
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'Tanzania',
  `tin` varchar(50) DEFAULT NULL,
  `vat_number` varchar(50) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT NULL,
  `credit_limit` decimal(10,2) DEFAULT 0.00,
  `current_balance` decimal(10,2) DEFAULT 0.00,
  `discount_percentage` decimal(5,2) DEFAULT 0.00,
  `tax_exempt` tinyint(1) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE','BLOCKED') DEFAULT 'ACTIVE',
  `parent_entity_id` varchar(50) DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_entities_type` (`type`),
  KEY `idx_entities_status` (`status`),
  KEY `idx_entities_name` (`name`),
  KEY `idx_entities_phone` (`phone`),
  KEY `idx_entities_email` (`email`),
  KEY `idx_entities_branch` (`branch_id`),
  KEY `idx_entities_parent` (`parent_entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entities`
--

LOCK TABLES `entities` WRITE;
/*!40000 ALTER TABLE `entities` DISABLE KEYS */;
INSERT INTO `entities` VALUES ('ENT-001','Walk-In Customer','CUSTOMER',NULL,NULL,NULL,NULL,'Tanzania',NULL,NULL,NULL,NULL,'CASH',0.00,0.00,0.00,0,NULL,'ACTIVE',NULL,NULL,'ADMIN-001','2025-12-29 09:34:55','2025-12-29 09:34:55'),('ENT-002','Local Pharmacy Suppliers','SUPPLIER','suppliers@local.co.tz','+255700000000','Mwanza Road','Mwanza','Tanzania',NULL,NULL,NULL,NULL,'NET30',0.00,0.00,0.00,0,NULL,'ACTIVE',NULL,NULL,'ADMIN-001','2025-12-29 09:34:55','2025-12-29 09:34:55'),('ENT-003','Dr. John Smith','CUSTOMER','john.smith@email.com','+255700111111','Plot 45, Block C','Mpanda','Tanzania',NULL,NULL,NULL,NULL,'CASH',0.00,0.00,0.00,0,NULL,'ACTIVE',NULL,NULL,'ADMIN-001','2025-12-29 09:34:55','2025-12-29 09:34:55'),('ENT-004','MediCare Pharmacy','BOTH','info@medicare.co.tz','+255700222222','Main Street','Singida','Tanzania',NULL,NULL,NULL,NULL,'NET30',0.00,0.00,0.00,0,NULL,'ACTIVE',NULL,NULL,'ADMIN-001','2025-12-29 09:34:55','2025-12-29 09:34:55');
/*!40000 ALTER TABLE `entities` ENABLE KEYS */;
UNLOCK TABLES;

-- Dump completed on 2026-01-01  3:10:09
