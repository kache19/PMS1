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
INSERT INTO `branch_inventory` VALUES ('BR002','P-1766564034117-0-4abzr',399,NULL),('BR002','P-1766564034117-30-paf8j',200,NULL),('BR003','P-1766564034117-0-4abzr',3000,NULL),('BR003','P-1766564034117-1-kacpg',12333,NULL),('BR003','P-1766564034117-2-bt597',300,NULL),('HEAD_OFFICE','P-1766564034117-0-4abzr',13330,NULL);
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
INSERT INTO `branches` VALUES ('BR002','MALENYA SAYUNI MEDICS','MPANDA-KATAVI','ADMIN-001','ACTIVE','2025-12-18 20:29:39',0),('BR003','MALENYA KINGDOM PHARMACY WHOLESALE MPANDA','MPANDA-KATAVI','ADMIN-001','ACTIVE','2025-12-17 20:47:33',1),('BR004','MALENYA UKOMBOZI PHARMACY','SINGIDA','ADMIN-001','ACTIVE','2025-12-18 20:32:00',0),('BR005','MALENYA MAJIMOTO PHARMACY WHOLESALE ','MAJIMOTO, MPIMBWE','ADMIN-001','ACTIVE','2025-12-19 17:49:21',0),('BR006','MALENYA UKOMBOZI PHARMACY','UKOMBOZI, SINGIDA','ADMIN-001','ACTIVE','2025-12-23 08:47:58',0),('BR007','MALENYA KINGDOM PHARMACY RETAILS','MPANDA, KATAVI','ADMIN-001','ACTIVE','2025-12-23 09:01:24',0),('HEAD_OFFICE','Head Office (Global View)','HQ',NULL,'ACTIVE','2025-12-16 15:44:38',0);
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
  `status` enum('ACTIVE','EXPIRED','REJECTED') DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `idx_batches_branch_product` (`branch_id`,`product_id`),
  CONSTRAINT `drug_batches_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `drug_batches_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `drug_batches`
--

LOCK TABLES `drug_batches` WRITE;
/*!40000 ALTER TABLE `drug_batches` DISABLE KEYS */;
INSERT INTO `drug_batches` VALUES (14,'HEAD_OFFICE','P-1766564034117-0-4abzr','1233','2025-12-24',13330,'ACTIVE','2025-12-24 08:14:14'),(15,'BR003','P-1766564034117-0-4abzr','1234','2025-12-24',3000,'ACTIVE','2025-12-24 09:06:44'),(16,'BR003','P-1766564034117-1-kacpg','23232','2025-12-24',12333,'ACTIVE','2025-12-24 09:33:11'),(17,'BR003','P-1766564034117-2-bt597','22','2025-12-24',300,'ACTIVE','2025-12-24 09:33:24'),(18,'BR002','P-1766564034117-0-4abzr','2332','2025-12-24',399,'ACTIVE','2025-12-24 15:20:59'),(19,'BR002','P-1766564034117-30-paf8j','2231','2025-12-24',200,'ACTIVE','2025-12-24 15:46:32');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_payments`
--

LOCK TABLES `invoice_payments` WRITE;
/*!40000 ALTER TABLE `invoice_payments` DISABLE KEYS */;
INSERT INTO `invoice_payments` VALUES (1,'INV-1766591751624-hzbklpvrv',615.96,'CASH','TRA-114046-990','2025-12-24 16:51:56'),(2,'INV-1766590186287-4rphml9uh',64.90,'CASH','TRA-139122-476','2025-12-24 16:52:20');
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
  `total_amount` decimal(15,2) NOT NULL,
  `paid_amount` decimal(15,2) DEFAULT 0.00,
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
INSERT INTO `invoices` VALUES ('INV-1766590186287-4rphml9uh','BR002','JOHN KACHE',64.90,64.90,'PAID','2025-12-24','POS Sale - 1 items','POS','[{\"id\":\"P-1766564034117-0-4abzr\",\"name\":\"ABDOMINAL BELT XXL\",\"genericName\":\"ABDOMINAL BELT XXL\",\"category\":\"General\",\"costPrice\":40,\"price\":55,\"unit\":\"Box\",\"minStockLevel\":4,\"requiresPrescription\":false,\"totalStock\":400,\"batches\":[],\"quantity\":1,\"selectedBatch\":\"BATCH-AUTO\",\"discount\":0}]',0,'2025-12-24 15:29:46'),('INV-1766591751624-hzbklpvrv','BR002','hassan,0689178892',615.96,615.96,'PAID','2025-12-24','POS Sale - 2 items','POS','[{\"id\":\"P-1766564034117-30-paf8j\",\"name\":\"AMOXYLLIN CAP 250MG\",\"genericName\":\"AMOXYLLIN CAP 250MG\",\"category\":\"General\",\"costPrice\":3,\"price\":4,\"unit\":\"Box\",\"minStockLevel\":791,\"requiresPrescription\":false,\"totalStock\":200,\"batches\":[],\"quantity\":103,\"selectedBatch\":\"BATCH-AUTO\",\"discount\":0},{\"id\":\"P-1766564034117-0-4abzr\",\"name\":\"ABDOMINAL BELT XXL\",\"genericName\":\"ABDOMINAL BELT XXL\",\"category\":\"General\",\"costPrice\":40,\"price\":55,\"unit\":\"Box\",\"minStockLevel\":4,\"requiresPrescription\":false,\"totalStock\":399,\"batches\":[],\"quantity\":2,\"selectedBatch\":\"BATCH-AUTO\",\"discount\":0}]',0,'2025-12-24 15:55:50');
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
INSERT INTO `products` VALUES ('P-1766564034117-0-4abzr','ABDOMINAL BELT XXL','ABDOMINAL BELT XXL','General',40.00,55.00,'Box',4,0,'2025-12-24 08:13:54'),('P-1766564034117-1-kacpg','ABITOL TABS 4MG','ABITOL TABS 4MG','General',2.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-10-d926c','ADRENALINE INJ','ADRENALINE INJ','General',1.00,1.00,'Box',60,0,'2025-12-24 08:13:54'),('P-1766564034117-100-yzojv','CARVEDILOL 12.5MG','CARVEDILOL 12.5MG','General',3.00,4.00,'Box',172,0,'2025-12-24 08:13:54'),('P-1766564034117-101-44f89','CARVEDILOL 6.25MG','CARVEDILOL 6.25MG','General',3.00,3.00,'Box',161,0,'2025-12-24 08:13:54'),('P-1766564034117-102-o2yhp','CASTOR OIL BOTTLE','CASTOR OIL BOTTLE','General',2.00,3.00,'Box',9,0,'2025-12-24 08:13:54'),('P-1766564034117-103-h868a','CATHY SANITARY PADS','CATHY SANITARY PADS','General',3.00,4.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-104-49quw','CEFADROXIL CAPS 500MG 10\'S','CEFADROXIL CAPS 500MG 10\'S','General',3.00,3.00,'Box',80,0,'2025-12-24 08:13:54'),('P-1766564034117-105-xjd45','CEFIXIME 200MG TAB','CEFIXIME 200MG TAB','General',3.00,3.00,'Box',494,0,'2025-12-24 08:13:54'),('P-1766564034117-106-750c1','CEFIXIME 400MG TAB','CEFIXIME 400MG TAB','General',6.00,8.00,'Box',4,0,'2025-12-24 08:13:54'),('P-1766564034117-107-7664r','CEFIXIME SYRUP','CEFIXIME SYRUP','General',2.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-108-6hi5y','CEFPODOXIME 200MG 10\'S','CEFPODOXIME 200MG 10\'S','General',8.00,9.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-109-ejh6h','CEFTRIAXONE + SULBACTAM INJ','CEFTRIAXONE + SULBACTAM INJ','General',2.00,3.00,'Box',697,0,'2025-12-24 08:13:54'),('P-1766564034117-11-a7amc','ADULT DIAPERS','ADULT DIAPERS','General',944.14,1.00,'Box',306,0,'2025-12-24 08:13:54'),('P-1766564034117-110-bsupu','CEFTRIAXONE INJ 1G','CEFTRIAXONE INJ 1G','General',680.32,1.00,'Box',201,0,'2025-12-24 08:13:54'),('P-1766564034117-111-y65a3','CEFUROXIME 250MG 10\'S','CEFUROXIME 250MG 10\'S','General',7.00,9.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-112-ixqur','CELESTAMINE TABS','CELESTAMINE TABS','General',7.00,13.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-113-wg6qo','CEPHALEXIN CAP 500MG','CEPHALEXIN CAP 500MG','General',14.00,16.00,'Box',29,0,'2025-12-24 08:13:54'),('P-1766564034117-114-myyq5','CEPHALEXIN CAPS 250MG','CEPHALEXIN CAPS 250MG','General',7.00,7.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034117-115-ceppz','CEPHALEXIN SYRUP 100ML BOTTLE','CEPHALEXIN SYRUP 100ML BOTTLE','General',1.00,2.00,'Box',615,0,'2025-12-24 08:13:54'),('P-1766564034117-116-74vw9','CERVICAL COLLAR','CERVICAL COLLAR','General',15.00,22.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-117-niqwh','CETRIZINE SYRUP BOTTLE','CETRIZINE SYRUP BOTTLE','General',804.73,1.00,'Box',4,0,'2025-12-24 08:13:54'),('P-1766564034117-118-r4yvb','CETRIZINE TABS','CETRIZINE TABS','General',1.00,2.00,'Box',619,0,'2025-12-24 08:13:54'),('P-1766564034117-119-54xak','CHESTCOF LOZENGES','CHESTCOF LOZENGES','General',6.00,8.00,'Box',68,0,'2025-12-24 08:13:54'),('P-1766564034117-12-cjfaq','ALBENDAZOLE SYRUP BOTTLE','ALBENDAZOLE SYRUP BOTTLE','General',550.00,700.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-120-qdcj5','CHESTCOF SYRUP BOTTLE','CHESTCOF SYRUP BOTTLE','General',1.00,2.00,'Box',285,0,'2025-12-24 08:13:54'),('P-1766564034117-121-gjh60','CHLORAMPHENICOL CAPS','CHLORAMPHENICOL CAPS','General',6.00,7.00,'Box',327,0,'2025-12-24 08:13:54'),('P-1766564034117-122-5i5rf','CHLORAMPHENICOL EYE DROP BOTTLE','CHLORAMPHENICOL EYE DROP BOTTLE','General',325.37,550.00,'Box',39,0,'2025-12-24 08:13:54'),('P-1766564034117-123-14j94','CHLORAMPHENICOL EYE OINT TUBE','CHLORAMPHENICOL EYE OINT TUBE','General',505.33,750.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034117-124-o7928','CHLORAMPHENICOL SYRUP 100ML','CHLORAMPHENICOL SYRUP 100ML','General',1.00,1.00,'Box',422,0,'2025-12-24 08:13:54'),('P-1766564034117-125-8c89w','CHROMC CUTGUT NO. 2/0  P12','CHROMC CUTGUT NO. 2/0  P12','General',11.00,18.00,'Box',20,0,'2025-12-24 08:13:54'),('P-1766564034117-126-nshxb','CIFRAN CT-100','CIFRAN CT-100','General',3.00,4.00,'Box',255,0,'2025-12-24 08:13:54'),('P-1766564034117-127-ivpec','CIMETIDINE TAB 400MG','CIMETIDINE TAB 400MG','General',24.00,25.00,'Box',20,0,'2025-12-24 08:13:54'),('P-1766564034117-128-71csk','CIPRO EYE/EAR DROP BOTTLE','CIPRO EYE/EAR DROP BOTTLE','General',400.00,1.00,'Box',22,0,'2025-12-24 08:13:54'),('P-1766564034117-129-ydbrv','CIPROFLOXACIN IV','CIPROFLOXACIN IV','General',750.00,900.00,'Box',110,0,'2025-12-24 08:13:54'),('P-1766564034117-13-4pr8k','ALBENDAZOLE TAB 2\'S PACKET (ALB','ALBENDAZOLE TAB 2\'S PACKET (ALB','General',269.65,310.00,'Box',23,0,'2025-12-24 08:13:54'),('P-1766564034117-130-0tkoz','CIPROFLOXACIN TAB','CIPROFLOXACIN TAB','General',4.00,6.00,'Box',39,0,'2025-12-24 08:13:54'),('P-1766564034117-131-w4suq','CITAL SYRUP','CITAL SYRUP','General',5.00,7.00,'Box',140,0,'2025-12-24 08:13:54'),('P-1766564034117-132-2v84v','CLARITHROMYCIN 20\'S TAB','CLARITHROMYCIN 20\'S TAB','General',14.00,18.00,'Box',46,0,'2025-12-24 08:13:54'),('P-1766564034117-133-k78lb','CLEAV KIT','CLEAV KIT','General',6.00,30.00,'Box',77,0,'2025-12-24 08:13:54'),('P-1766564034117-134-e6x8f','CLEAV TABS 4\'S','CLEAV TABS 4\'S','General',2.00,3.00,'Box',64,0,'2025-12-24 08:13:54'),('P-1766564034117-135-x1spc','CLINDAMYCIN CAPS 150MG','CLINDAMYCIN CAPS 150MG','General',7.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-136-nap3d','CLINDAMYCIN GEL 1%','CLINDAMYCIN GEL 1%','General',1.00,2.00,'Box',64,0,'2025-12-24 08:13:54'),('P-1766564034117-137-ktele','CLOMIPHENE TAB','CLOMIPHENE TAB','General',2.00,3.00,'Box',127,0,'2025-12-24 08:13:54'),('P-1766564034117-138-602uv','CLOPIDOGREL TAB','CLOPIDOGREL TAB','General',3.00,3.00,'Box',148,0,'2025-12-24 08:13:54'),('P-1766564034117-139-9hq4b','CLOTRILIN V CREAM','CLOTRILIN V CREAM','General',1.00,1.00,'Box',608,0,'2025-12-24 08:13:54'),('P-1766564034117-14-r20sh','ALLOPURINOL TAB 300MG 100\'S','ALLOPURINOL TAB 300MG 100\'S','General',8.00,8.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-140-s82yd','CLOTRIMAZOLE CREAM (OTHERS) PRI','CLOTRIMAZOLE CREAM (OTHERS) PRI','General',401.10,650.00,'Box',486,0,'2025-12-24 08:13:54'),('P-1766564034117-141-lo6m8','CLOTRIMAZOLE PESSARY 6s PACKET','CLOTRIMAZOLE PESSARY 6s PACKET','General',650.00,1.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034117-142-jqisd','COFFNIL HERBAL SYRUP','COFFNIL HERBAL SYRUP','General',1.00,1.00,'Box',347,0,'2025-12-24 08:13:54'),('P-1766564034117-143-9rvwm','COFTA LOZENGES','COFTA LOZENGES','General',6.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-144-9zkdp','COLD CAP SYRUP','COLD CAP SYRUP','General',2.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-145-723an','COLD OFF CAP','COLD OFF CAP','General',7.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-146-tey78','COLD OIL (SEVEN SEAS)','COLD OIL (SEVEN SEAS)','General',8.00,9.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-147-szgna','COLD VAN CAPS','COLD VAN CAPS','General',0.00,7.00,'Box',3,0,'2025-12-24 08:13:54'),('P-1766564034117-148-2cjs0','COLDCAP 96\'S CAPS','COLDCAP 96\'S CAPS','General',12.00,14.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-149-fbdwb','COLDRIL CAPS','COLDRIL CAPS','General',1.00,2.00,'Box',443,0,'2025-12-24 08:13:54'),('P-1766564034117-15-x281s','ALTAPHAM SYRUP BOTTLE','ALTAPHAM SYRUP BOTTLE','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-16-lbemo','ALU CAT 1','ALU CAT 1','General',637.03,750.00,'Box',30,0,'2025-12-24 08:13:54'),('P-1766564034117-17-60wz5','ALU CAT 2','ALU CAT 2','General',900.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-18-s24if','ALU CAT 4 PACKET','ALU CAT 4 PACKET','General',802.82,1.00,'Box',23,0,'2025-12-24 08:13:54'),('P-1766564034117-19-uwtvp','ALU SYRUP 60ML BOTTLE','ALU SYRUP 60ML BOTTLE','General',2.00,3.00,'Box',220,0,'2025-12-24 08:13:54'),('P-1766564034117-2-bt597','ACECLOFENAC TABS','ACECLOFENAC TABS','General',49.00,550.00,'Box',75,0,'2025-12-24 08:13:54'),('P-1766564034117-20-su84d','ALUGEL SYRUP BOTTLE','ALUGEL SYRUP BOTTLE','General',1.00,1.00,'Box',3,0,'2025-12-24 08:13:54'),('P-1766564034117-21-ekbwp','AMINOPHYLINE INJ','AMINOPHYLINE INJ','General',985.00,1.00,'Box',55,0,'2025-12-24 08:13:54'),('P-1766564034117-22-p1ckj','AMINOPHYLINE TAB PKT','AMINOPHYLINE TAB PKT','General',2.00,3.00,'Box',259,0,'2025-12-24 08:13:54'),('P-1766564034117-23-yh0mn','AMITRIPTYLINE TAB','AMITRIPTYLINE TAB','General',7.00,9.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034117-24-siq5w','AMLODIPINE TAB 10MG','AMLODIPINE TAB 10MG','General',1.00,2.00,'Box',490,0,'2025-12-24 08:13:54'),('P-1766564034117-25-bzzjx','AMLODIPINE TAB 5MG','AMLODIPINE TAB 5MG','General',1.00,1.00,'Box',366,0,'2025-12-24 08:13:54'),('P-1766564034117-26-cjyis','AMOL G CREAM TUBE','AMOL G CREAM TUBE','General',2.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-27-fl0nx','AMOX-CLAV SYRUP 228.5','AMOX-CLAV SYRUP 228.5','General',3.00,4.00,'Box',262,0,'2025-12-24 08:13:54'),('P-1766564034117-28-3ojx6','AMOXCLAV TAB PACKET','AMOXCLAV TAB PACKET','General',3.00,4.00,'Box',2,0,'2025-12-24 08:13:54'),('P-1766564034117-29-h0yg6','AMOXLAV INJ','AMOXLAV INJ','General',3.00,3.00,'Box',408,0,'2025-12-24 08:13:54'),('P-1766564034117-3-zo5cb','ACNE FREE TUBE','ACNE FREE TUBE','General',6.00,8.00,'Box',75,0,'2025-12-24 08:13:54'),('P-1766564034117-30-paf8j','AMOXYLLIN CAP 250MG','AMOXYLLIN CAP 250MG','General',3.00,4.00,'Box',791,0,'2025-12-24 08:13:54'),('P-1766564034117-31-dnydm','AMOXYLLIN DT TABS','AMOXYLLIN DT TABS','General',5.00,7.00,'Box',126,0,'2025-12-24 08:13:54'),('P-1766564034117-32-kfenm','AMOXYLLINE SYRUP 100ML BOTTLE','AMOXYLLINE SYRUP 100ML BOTTLE','General',843.97,1.00,'Box',3,0,'2025-12-24 08:13:54'),('P-1766564034117-33-u3u5w','AMPICILLIN + SULBACTUM 375MG TA','AMPICILLIN + SULBACTUM 375MG TA','General',11.00,15.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-34-oqehb','AMPICILLIN CAPS 250MG','AMPICILLIN CAPS 250MG','General',6.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-35-mudo9','AMPICILLIN INJ 500MG VIAL','AMPICILLIN INJ 500MG VIAL','General',550.00,950.00,'Box',171,0,'2025-12-24 08:13:54'),('P-1766564034117-36-sbm4c','AMPICILLIN SYRUP 100ML BOTTLE','AMPICILLIN SYRUP 100ML BOTTLE','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-37-mwmmj','AMPICLOX CAPS 500MG','AMPICLOX CAPS 500MG','General',8.00,10.00,'Box',4,0,'2025-12-24 08:13:54'),('P-1766564034117-38-pbgia','AMPICLOX INJ 500MG VIAL','AMPICLOX INJ 500MG VIAL','General',650.00,850.00,'Box',515,0,'2025-12-24 08:13:54'),('P-1766564034117-39-laurf','AMPICLOX NEONATAL','AMPICLOX NEONATAL','General',2.00,3.00,'Box',54,0,'2025-12-24 08:13:54'),('P-1766564034117-4-ewtjf','ACRASON CREAM TUBE','ACRASON CREAM TUBE','General',2.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-40-1e9mb','AMPICLOX SYRUP 100ML BOTTLE','AMPICLOX SYRUP 100ML BOTTLE','General',1.00,1.00,'Box',296,0,'2025-12-24 08:13:54'),('P-1766564034117-41-dk7i8','ANT-RABIES IMMUNOGLOBIN','ANT-RABIES IMMUNOGLOBIN','General',20.00,24.00,'Box',101,0,'2025-12-24 08:13:54'),('P-1766564034117-42-h0dkq','ANTI-D IMMUNOGLOBULIN','ANTI-D IMMUNOGLOBULIN','General',121.00,170.00,'Box',3,0,'2025-12-24 08:13:54'),('P-1766564034117-43-6su34','ANTIHISTAMINE CREAM TUBE','ANTIHISTAMINE CREAM TUBE','General',1.00,1.00,'Box',37,0,'2025-12-24 08:13:54'),('P-1766564034117-44-2wpf4','ANUSOL OINTMENT TUBE','ANUSOL OINTMENT TUBE','General',7.00,13.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-45-7tdaa','ANUSOL SUPOSSITORY TABS','ANUSOL SUPOSSITORY TABS','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-46-lzn6p','APCALIS CT 20MG','APCALIS CT 20MG','General',2.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-47-nnz4r','APDYL- H HERBAL SYRUP','APDYL- H HERBAL SYRUP','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-48-vwamg','ARTEMETHER INJ 80MG','ARTEMETHER INJ 80MG','General',467.00,600.00,'Box',555,0,'2025-12-24 08:13:54'),('P-1766564034117-49-5tpx8','ARTEQUICK TAB 6s PACKET','ARTEQUICK TAB 6s PACKET','General',7.00,8.00,'Box',13,0,'2025-12-24 08:13:54'),('P-1766564034117-5-l2omz','ACTINAC PLUS TABLET','ACTINAC PLUS TABLET','General',2.00,3.00,'Box',225,0,'2025-12-24 08:13:54'),('P-1766564034117-50-p88ao','ARTESUNATE INJ 30MG','ARTESUNATE INJ 30MG','General',2.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-51-4lxe3','ARTESUNATE INJ. 60MG','ARTESUNATE INJ. 60MG','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-52-ibz7i','ASCARD TAB 75MG','ASCARD TAB 75MG','General',1.00,2.00,'Box',118,0,'2025-12-24 08:13:54'),('P-1766564034117-53-mbj5e','ASCORIL D SYRUP','ASCORIL D SYRUP','General',2.00,3.00,'Box',45,0,'2025-12-24 08:13:54'),('P-1766564034117-54-30bnc','ATENOLOL TAB 50MG','ATENOLOL TAB 50MG','General',2.00,3.00,'Box',47,0,'2025-12-24 08:13:54'),('P-1766564034117-55-cc20n','ATORVASTATIN TAB 10MG','ATORVASTATIN TAB 10MG','General',2.00,2.00,'Box',66,0,'2025-12-24 08:13:54'),('P-1766564034117-56-fz67s','ATORVASTATIN TABS 20MG','ATORVASTATIN TABS 20MG','General',1.00,2.00,'Box',70,0,'2025-12-24 08:13:54'),('P-1766564034117-57-kawox','ATROPINE INJ','ATROPINE INJ','General',997.11,1.00,'Box',110,0,'2025-12-24 08:13:54'),('P-1766564034117-58-armfx','AZITHROMYCIN SYRUP BOTTLE 15MLS','AZITHROMYCIN SYRUP BOTTLE 15MLS','General',1.00,1.00,'Box',105,0,'2025-12-24 08:13:54'),('P-1766564034117-59-12pjj','AZITHROMYCIN TAB 500MG NOT AZUM','AZITHROMYCIN TAB 500MG NOT AZUM','General',1.00,1.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034117-6-918jc','ACTION TAB','ACTION TAB','General',6.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-60-ww27w','AZUMA TAB 250MG','AZUMA TAB 250MG','General',1.00,1.00,'Box',164,0,'2025-12-24 08:13:54'),('P-1766564034117-61-gs9fr','AZUMA TAB 500MG','AZUMA TAB 500MG','General',1.00,2.00,'Box',2,0,'2025-12-24 08:13:54'),('P-1766564034117-62-ojjwi','BABY WIPES','BABY WIPES','General',2.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-63-eqjpu','BAHASHA KAKI 100\'S','BAHASHA KAKI 100\'S','General',719.90,1.00,'Box',70,0,'2025-12-24 08:13:54'),('P-1766564034117-64-evxhp','BAHASHA KAKI KUBWA 120\'S','BAHASHA KAKI KUBWA 120\'S','General',4.00,6.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-65-ghe3v','BBE SOLUTION','BBE SOLUTION','General',754.20,1.00,'Box',199,0,'2025-12-24 08:13:54'),('P-1766564034117-66-2ph0o','BELLADONA SYRUP 100ML BOTTLE','BELLADONA SYRUP 100ML BOTTLE','General',1.00,1.00,'Box',359,0,'2025-12-24 08:13:54'),('P-1766564034117-67-qjvqe','BENDROFLUMETHIAZIDE TAB','BENDROFLUMETHIAZIDE TAB','General',6.00,6.00,'Box',33,0,'2025-12-24 08:13:54'),('P-1766564034117-68-aud0s','BENZATHINE PENICILLIN INJ PENAD','BENZATHINE PENICILLIN INJ PENAD','General',796.34,950.00,'Box',126,0,'2025-12-24 08:13:54'),('P-1766564034117-69-remg0','BENZYL PENICILLIN INJ 5000000IU','BENZYL PENICILLIN INJ 5000000IU','General',800.00,950.00,'Box',146,0,'2025-12-24 08:13:54'),('P-1766564034117-7-7sxuf','ACYCLOVIR EYE OINTMENT','ACYCLOVIR EYE OINTMENT','General',3.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-70-cpb4f','BETACORT N CREAM','BETACORT N CREAM','General',2.00,2.00,'Box',320,0,'2025-12-24 08:13:54'),('P-1766564034117-71-mv6li','BETADERM CREAM','BETADERM CREAM','General',2.00,3.00,'Box',3,0,'2025-12-24 08:13:54'),('P-1766564034117-72-9p7fs','BETASIL SYRUP CHILD','BETASIL SYRUP CHILD','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-73-k7evd','BETROZOLE SYRUP','BETROZOLE SYRUP','General',2.00,2.00,'Box',113,0,'2025-12-24 08:13:54'),('P-1766564034117-74-k79yc','BISACODYL TAB','BISACODYL TAB','General',3.00,4.00,'Box',135,0,'2025-12-24 08:13:54'),('P-1766564034117-75-vdof2','BISOPROLOL TABLET 5MG','BISOPROLOL TABLET 5MG','General',6.00,10.00,'Box',123,0,'2025-12-24 08:13:54'),('P-1766564034117-76-saizx','BISOPROLOL TABLET10MG','BISOPROLOL TABLET10MG','General',8.00,10.00,'Box',210,0,'2025-12-24 08:13:54'),('P-1766564034117-77-bl6a1','BLOOD GIVING SET','BLOOD GIVING SET','General',610.69,1.00,'Box',21,0,'2025-12-24 08:13:54'),('P-1766564034117-78-j0kpv','BONISAN','BONISAN','General',6.00,8.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-79-br93z','BORIC ACID EAR DROP BOTTLE','BORIC ACID EAR DROP BOTTLE','General',650.00,1.00,'Box',18,0,'2025-12-24 08:13:54'),('P-1766564034117-8-geavg','ACYCLOVIR SKIN CREAM TUBE','ACYCLOVIR SKIN CREAM TUBE','General',1.00,1.00,'Box',81,0,'2025-12-24 08:13:54'),('P-1766564034117-80-mzt7x','BROMOCRIPTINE TAB','BROMOCRIPTINE TAB','General',16.00,18.00,'Box',4,0,'2025-12-24 08:13:54'),('P-1766564034117-81-y3but','BROZEN SYRUP 100ML BOTTLE','BROZEN SYRUP 100ML BOTTLE','General',857.12,2.00,'Box',139,0,'2025-12-24 08:13:54'),('P-1766564034117-82-ld78p','BRUSTAN TAB PACKET','BRUSTAN TAB PACKET','General',1.00,2.00,'Box',3,0,'2025-12-24 08:13:54'),('P-1766564034117-83-ilcrl','BURN CREAM 20G','BURN CREAM 20G','General',1.00,1.00,'Box',38,0,'2025-12-24 08:13:54'),('P-1766564034117-84-bauzr','BURNOX CREAM 30G TUBE','BURNOX CREAM 30G TUBE','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-85-k8mrj','BURRETE GIVING SET','BURRETE GIVING SET','General',2.00,2.00,'Box',74,0,'2025-12-24 08:13:54'),('P-1766564034117-86-kwcw0','CALAMINE LOTION BOTTLE','CALAMINE LOTION BOTTLE','General',762.20,1.00,'Box',109,0,'2025-12-24 08:13:54'),('P-1766564034117-87-mol7d','CANDESARTAN TABS 16MG','CANDESARTAN TABS 16MG','General',12.00,13.00,'Box',153,0,'2025-12-24 08:13:54'),('P-1766564034117-88-7qyd5','CANDESARTAN TABS 8MG 30\'s','CANDESARTAN TABS 8MG 30\'s','General',6.00,7.00,'Box',100,0,'2025-12-24 08:13:54'),('P-1766564034117-89-us7wd','CANDID POWDER','CANDID POWDER','General',3.00,3.00,'Box',22,0,'2025-12-24 08:13:54'),('P-1766564034117-9-5ozgi','ACYCLOVIR TAB 200MG','ACYCLOVIR TAB 200MG','General',9.00,11.00,'Box',52,0,'2025-12-24 08:13:54'),('P-1766564034117-90-2offy','CANDIDERM CREAM TUBE','CANDIDERM CREAM TUBE','General',2.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-91-niuwy','CANDISTAT CREAM TUBE','CANDISTAT CREAM TUBE','General',1.00,1.00,'Box',33,0,'2025-12-24 08:13:54'),('P-1766564034117-92-5sxhp','CANNULA 18G GREEN','CANNULA 18G GREEN','General',185.09,300.00,'Box',248,0,'2025-12-24 08:13:54'),('P-1766564034117-93-fbz2m','CANNULA 20G PINK','CANNULA 20G PINK','General',175.13,300.00,'Box',446,0,'2025-12-24 08:13:54'),('P-1766564034117-94-d6gh5','CANNULA 22G BLUE','CANNULA 22G BLUE','General',207.07,300.00,'Box',312,0,'2025-12-24 08:13:54'),('P-1766564034117-95-37akr','CANNULA 24G YELLOW','CANNULA 24G YELLOW','General',180.68,300.00,'Box',2,0,'2025-12-24 08:13:54'),('P-1766564034117-96-8fsay','CAPTOPRIL TAB 25MG','CAPTOPRIL TAB 25MG','General',6.00,8.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-97-6wawd','CARBAMAZEPINE TABS 200MG','CARBAMAZEPINE TABS 200MG','General',9.00,11.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034117-98-bwgsk','CARBOCISTEINE SYRUP ADULT 5%','CARBOCISTEINE SYRUP ADULT 5%','General',1.00,2.00,'Box',24,0,'2025-12-24 08:13:54'),('P-1766564034117-99-gmaw6','CARBOCISTEINE SYRUP CHILD 2%','CARBOCISTEINE SYRUP CHILD 2%','General',1.00,2.00,'Box',77,0,'2025-12-24 08:13:54'),('P-1766564034118-150-rbkwo','COLDRIL SYRUP BOTTLE','COLDRIL SYRUP BOTTLE','General',1.00,2.00,'Box',346,0,'2025-12-24 08:13:54'),('P-1766564034118-151-un5js','COLGATE  140G','COLGATE  140G','General',3.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-152-hxa73','COLGATE  70G','COLGATE  70G','General',1.00,2.00,'Box',61,0,'2025-12-24 08:13:54'),('P-1766564034118-153-ld03b','COLGATE CHARCOAL 120G','COLGATE CHARCOAL 120G','General',4.00,4.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-154-20ggo','COLGATE MAXFRESH 130G','COLGATE MAXFRESH 130G','General',3.00,4.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-155-w46bi','COLGATE MAXFRESH 65G','COLGATE MAXFRESH 65G','General',2.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-156-q4296','COLGATE MISWAKI','COLGATE MISWAKI','General',1.00,1.00,'Box',36,0,'2025-12-24 08:13:54'),('P-1766564034118-157-52sow','CONDOM BULL,KISS,LIFEGUARD','CONDOM BULL,KISS,LIFEGUARD','General',385.40,450.00,'Box',2,0,'2025-12-24 08:13:54'),('P-1766564034118-158-83z8b','CONDOM FIESTA','CONDOM FIESTA','General',535.52,750.00,'Box',30,0,'2025-12-24 08:13:54'),('P-1766564034118-159-9r3k2','CONDOM FLAME','CONDOM FLAME','General',780.00,980.00,'Box',14,0,'2025-12-24 08:13:54'),('P-1766564034118-160-jtl42','CONDOM REGULAR (DUME)','CONDOM REGULAR (DUME)','General',283.64,350.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-161-e881v','COPHYDEX SYRUP BOTTLE','COPHYDEX SYRUP BOTTLE','General',1.00,1.00,'Box',2,0,'2025-12-24 08:13:54'),('P-1766564034118-162-3wxbs','CORD CLAMP','CORD CLAMP','General',111.17,250.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034118-163-tt0v7','COTTON WOOL 100G','COTTON WOOL 100G','General',895.51,1.00,'Box',620,0,'2025-12-24 08:13:54'),('P-1766564034118-164-dhuk3','COTTON WOOL 50G','COTTON WOOL 50G','General',505.00,700.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-165-3r7xk','CREPE BANDAGE 10CM','CREPE BANDAGE 10CM','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-166-t0lif','CREPE BANDAGE 15 CM','CREPE BANDAGE 15 CM','General',1.00,1.00,'Box',89,0,'2025-12-24 08:13:54'),('P-1766564034118-167-33qza','CREPE BANDAGE 5CM','CREPE BANDAGE 5CM','General',736.76,1.00,'Box',587,0,'2025-12-24 08:13:54'),('P-1766564034118-168-swedz','CREPE BANDAGE 7.5 CM','CREPE BANDAGE 7.5 CM','General',648.20,1.00,'Box',358,0,'2025-12-24 08:13:54'),('P-1766564034118-169-nfw21','DAWA TATU TABS','DAWA TATU TABS','General',8.00,9.00,'Box',36,0,'2025-12-24 08:13:54'),('P-1766564034118-170-p2axo','DAWA YA MBA LOTION 100ML BOTTLE','DAWA YA MBA LOTION 100ML BOTTLE','General',550.00,750.00,'Box',29,0,'2025-12-24 08:13:54'),('P-1766564034118-171-8z7co','DEEP HEAT SPRAY','DEEP HEAT SPRAY','General',13.00,17.00,'Box',54,0,'2025-12-24 08:13:54'),('P-1766564034118-172-dacve','DENTAMOL TAB','DENTAMOL TAB','General',1.00,2.00,'Box',4,0,'2025-12-24 08:13:54'),('P-1766564034118-173-vztgc','DENTAWISS 125MLS','DENTAWISS 125MLS','General',3.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-174-9w45q','DEPO PROVERA INJ','DEPO PROVERA INJ','General',1.00,1.00,'Box',185,0,'2025-12-24 08:13:54'),('P-1766564034118-175-sk8o3','DEPROFOS INJ.','DEPROFOS INJ.','General',18.00,22.00,'Box',12,0,'2025-12-24 08:13:54'),('P-1766564034118-176-eds3f','DERMAQUIT CREAM 15MG','DERMAQUIT CREAM 15MG','General',3.00,3.00,'Box',6,0,'2025-12-24 08:13:54'),('P-1766564034118-177-pwu6z','DESLORATADINE TABS 30\'S','DESLORATADINE TABS 30\'S','General',5.00,8.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-178-dk4u9','DETTOL BRND 60MLS','DETTOL BRND 60MLS','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-179-riczg','DETTOL SOAP','DETTOL SOAP','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-180-7ro2w','DETTOL SOAP JUNIOR','DETTOL SOAP JUNIOR','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-181-wjnqn','DETTOL SOAP KUBWA','DETTOL SOAP KUBWA','General',2.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-182-we7tc','DETTOL SOLN 125ML','DETTOL SOLN 125ML','General',3.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-183-jozto','DETTOL SOLN 50MLS','DETTOL SOLN 50MLS','General',1.00,1.00,'Box',12,0,'2025-12-24 08:13:54'),('P-1766564034118-184-zyp50','DETTOL SOLUTION 100MLS BOTTLE','DETTOL SOLUTION 100MLS BOTTLE','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-185-ytkyh','DETTTOL SOLN 500MLS','DETTTOL SOLN 500MLS','General',9.00,11.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-186-9tu6v','DEXA-CHLORO EYE DROP BOTTLE','DEXA-CHLORO EYE DROP BOTTLE','General',1.00,1.00,'Box',175,0,'2025-12-24 08:13:54'),('P-1766564034118-187-6oqgm','DEXA-GENTA EYE DROP','DEXA-GENTA EYE DROP','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-188-7bho0','DEXA-NEO EYE DROP BOTTLE','DEXA-NEO EYE DROP BOTTLE','General',769.46,950.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034118-189-ka00n','DEXAMETHASONE EYE DROPS','DEXAMETHASONE EYE DROPS','General',700.00,1.00,'Box',960,0,'2025-12-24 08:13:54'),('P-1766564034118-190-lta7y','DEXAMETHASONE INJ','DEXAMETHASONE INJ','General',718.85,1.00,'Box',100,0,'2025-12-24 08:13:54'),('P-1766564034118-191-ga07h','DEXAMETHASONE TAB','DEXAMETHASONE TAB','General',9.00,10.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-192-9ljem','DEXTROSE 10%','DEXTROSE 10%','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-193-hrqts','DEXTROSE 5%','DEXTROSE 5%','General',949.40,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-194-u565l','DEXTROSE+ NORMAL SALINE (DNS)','DEXTROSE+ NORMAL SALINE (DNS)','General',950.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-195-ez7zj','DIAZEPAM INJ','DIAZEPAM INJ','General',1.00,1.00,'Box',50,0,'2025-12-24 08:13:54'),('P-1766564034118-196-7l06d','DIAZEPAM TABS PKT','DIAZEPAM TABS PKT','General',2.00,3.00,'Box',27,0,'2025-12-24 08:13:54'),('P-1766564034118-197-3e7zw','DICLOFENAC GEL TUBE','DICLOFENAC GEL TUBE','General',549.99,750.00,'Box',102,0,'2025-12-24 08:13:54'),('P-1766564034118-198-bu628','DICLOFENAC INJ 75MG AMP','DICLOFENAC INJ 75MG AMP','General',150.17,250.00,'Box',2,0,'2025-12-24 08:13:54'),('P-1766564034118-199-rse7t','DICLOFENAC TABS PACKET','DICLOFENAC TABS PACKET','General',1.00,1.00,'Box',115,0,'2025-12-24 08:13:54'),('P-1766564034118-200-yaigl','DICLOPAR CHUI TABS PACKET','DICLOPAR CHUI TABS PACKET','General',4.00,4.00,'Box',532,0,'2025-12-24 08:13:54'),('P-1766564034118-201-xyp57','DICLOPAR GEL TUBE','DICLOPAR GEL TUBE','General',2.00,2.00,'Box',153,0,'2025-12-24 08:13:54'),('P-1766564034118-202-siwqf','DICLOPAR MR TAB','DICLOPAR MR TAB','General',1.00,1.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034118-203-qkjqx','DIGOXIN TAB','DIGOXIN TAB','General',9.00,14.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-204-yzd75','DOMPERIDONE 10MG TAB','DOMPERIDONE 10MG TAB','General',7.00,9.00,'Box',134,0,'2025-12-24 08:13:54'),('P-1766564034118-205-p3aik','DOXYCYCLINE CAPS PACKET','DOXYCYCLINE CAPS PACKET','General',4.00,6.00,'Box',82,0,'2025-12-24 08:13:54'),('P-1766564034118-206-8k4qa','DR COLD SYRUP BOTTLE','DR COLD SYRUP BOTTLE','General',2.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-207-zi6t1','DR COLD TAB 4\'S','DR COLD TAB 4\'S','General',292.00,340.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034118-208-tbdrh','DUO-COTECXIN CHILD PACKET','DUO-COTECXIN CHILD PACKET','General',3.00,4.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-209-lhvvc','DUO-COTECXIN TAB ADULT 9s PACK','DUO-COTECXIN TAB ADULT 9s PACK','General',6.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-210-ox90q','DUPHASTON TAB','DUPHASTON TAB','General',19.00,30.00,'Box',20,0,'2025-12-24 08:13:54'),('P-1766564034118-211-cpyfa','ECONAZINE CREAM 10G','ECONAZINE CREAM 10G','General',1.00,2.00,'Box',50,0,'2025-12-24 08:13:54'),('P-1766564034118-212-ewg2u','EKEFLIN TAB PACKET','EKEFLIN TAB PACKET','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-213-644vl','ELBOW SUPPORT XL','ELBOW SUPPORT XL','General',8.00,12.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-214-2qlse','ELYCLOB G CREAM TUBE','ELYCLOB G CREAM TUBE','General',2.00,2.00,'Box',198,0,'2025-12-24 08:13:54'),('P-1766564034118-215-y0twx','ELYCORT CREAM TUBE','ELYCORT CREAM TUBE','General',1.00,1.00,'Box',275,0,'2025-12-24 08:13:54'),('P-1766564034118-216-267ga','ELYCORT OINTMENT TUBE','ELYCORT OINTMENT TUBE','General',1.00,1.00,'Box',68,0,'2025-12-24 08:13:54'),('P-1766564034118-217-axz7f','ELYVATE CREAM TUBE','ELYVATE CREAM TUBE','General',1.00,1.00,'Box',141,0,'2025-12-24 08:13:54'),('P-1766564034118-218-pc4io','ELYVATE OINTMENT TUBE','ELYVATE OINTMENT TUBE','General',1.00,1.00,'Box',6,0,'2025-12-24 08:13:54'),('P-1766564034118-219-jmde0','EMDELYN SYRUP ADULT BOTTLE','EMDELYN SYRUP ADULT BOTTLE','General',1.00,2.00,'Box',131,0,'2025-12-24 08:13:54'),('P-1766564034118-220-5frsz','EMDELYN SYRUP CHILD 100ML','EMDELYN SYRUP CHILD 100ML','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-221-cswrp','ENALAPRIL TAB','ENALAPRIL TAB','General',6.00,8.00,'Box',31,0,'2025-12-24 08:13:54'),('P-1766564034118-222-dp4ou','ENEMAX','ENEMAX','General',5.00,5.00,'Box',46,0,'2025-12-24 08:13:54'),('P-1766564034118-223-jcfxr','ENO LEMON SACHET','ENO LEMON SACHET','General',13.00,16.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-224-gjtm1','ENO TABS','ENO TABS','General',11.00,13.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-225-zqlov','ENOXAPARIN INJ','ENOXAPARIN INJ','General',13.00,15.00,'Box',9,0,'2025-12-24 08:13:54'),('P-1766564034118-226-0l5yg','ENTEZMA OINTMENT TUBE 30GM','ENTEZMA OINTMENT TUBE 30GM','General',4.00,4.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-227-e8wb8','EPHEDRINE INJ.','EPHEDRINE INJ.','General',535.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-228-v1pt5','EPHEDRINE NASAL DROP ISORYN CHD','EPHEDRINE NASAL DROP ISORYN CHD','General',1.00,1.00,'Box',696,0,'2025-12-24 08:13:54'),('P-1766564034118-229-ssifz','EPHEDRINE NASAL ISORYN DROP ADT','EPHEDRINE NASAL ISORYN DROP ADT','General',1.00,1.00,'Box',34,0,'2025-12-24 08:13:54'),('P-1766564034118-230-5zii9','ERECTO TAB 100MG 1s  PACKET','ERECTO TAB 100MG 1s  PACKET','General',2.00,3.00,'Box',237,0,'2025-12-24 08:13:54'),('P-1766564034118-231-3plyw','ERECTO TAB 50MG 1s PACKET','ERECTO TAB 50MG 1s PACKET','General',1.00,1.00,'Box',778,0,'2025-12-24 08:13:54'),('P-1766564034118-232-4vvzp','ERYTHROMYCIN TAB PACKET','ERYTHROMYCIN TAB PACKET','General',7.00,8.00,'Box',469,0,'2025-12-24 08:13:54'),('P-1766564034118-233-5ffsw','ERYTHROMYCINE SYRUP 100ML BOTTL','ERYTHROMYCINE SYRUP 100ML BOTTL','General',1.00,1.00,'Box',756,0,'2025-12-24 08:13:54'),('P-1766564034118-234-bl0d0','ESOMEPRAZOLE 40MG TABS','ESOMEPRAZOLE 40MG TABS','General',5.00,5.00,'Box',62,0,'2025-12-24 08:13:54'),('P-1766564034118-235-hoft3','EUSOL 100ML BOTTLE','EUSOL 100ML BOTTLE','General',425.00,550.00,'Box',22,0,'2025-12-24 08:13:54'),('P-1766564034118-236-9mgz4','FASTUM CAP','FASTUM CAP','General',19.00,21.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-237-4fv13','FASTUM GEL 30MG','FASTUM GEL 30MG','General',4.00,5.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-238-if8jn','FEEDING TUBE SIZE 16','FEEDING TUBE SIZE 16','General',550.00,700.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-239-z1e0a','FEFO TAB 100s PACKET','FEFO TAB 100s PACKET','General',2.00,3.00,'Box',40,0,'2025-12-24 08:13:54'),('P-1766564034118-240-gs52a','FERRO/ FERROTONE B SYRUP 100ML','FERRO/ FERROTONE B SYRUP 100ML','General',0.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-241-jwl6u','FERROTONE CAPS 50\'S','FERROTONE CAPS 50\'S','General',6.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-242-r43j1','FINASTERIDE TABS 5MG 30\'s','FINASTERIDE TABS 5MG 30\'s','General',9.00,12.00,'Box',88,0,'2025-12-24 08:13:54'),('P-1766564034118-243-q8lex','FLAMAR MX TABS PACKET','FLAMAR MX TABS PACKET','General',3.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-244-skgf9','FLAVOUR TAB','FLAVOUR TAB','General',182.50,400.00,'Box',2,0,'2025-12-24 08:13:54'),('P-1766564034118-245-6r6cw','FLUCAMOX CAPS PACKET','FLUCAMOX CAPS PACKET','General',6.00,7.00,'Box',328,0,'2025-12-24 08:13:54'),('P-1766564034118-246-yfkzq','FLUCAMOX SYRUP 100ML BOTTLE','FLUCAMOX SYRUP 100ML BOTTLE','General',5.00,8.00,'Box',9,0,'2025-12-24 08:13:54'),('P-1766564034118-247-1vfrx','FLUCAN TAB 150MG','FLUCAN TAB 150MG','General',450.00,550.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-248-z0fy8','FLUCOMOL CAPS','FLUCOMOL CAPS','General',18.00,22.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-249-dr9m9','FLUCONAZOLE INJ','FLUCONAZOLE INJ','General',1.00,2.00,'Box',28,0,'2025-12-24 08:13:54'),('P-1766564034118-250-o3248','FLUCONAZOLE TABS 150 MG LOW PRI','FLUCONAZOLE TABS 150 MG LOW PRI','General',220.00,350.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-251-caxp6','FLUCONAZOLE TABS 200MG','FLUCONAZOLE TABS 200MG','General',1.00,3.00,'Box',423,0,'2025-12-24 08:13:54'),('P-1766564034118-252-9gd7v','FLUCOR DAY','FLUCOR DAY','General',3.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-253-zzhhw','FLUTICASONE NASAL SPRAY','FLUTICASONE NASAL SPRAY','General',8.00,11.00,'Box',55,0,'2025-12-24 08:13:54'),('P-1766564034118-254-3bmll','FOLIC ACID TAB PKT','FOLIC ACID TAB PKT','General',1.00,1.00,'Box',39,0,'2025-12-24 08:13:54'),('P-1766564034118-255-sa9fu','FOLLEY BALOON CATHETER 2 WAY 16','FOLLEY BALOON CATHETER 2 WAY 16','General',899.94,1.00,'Box',532,0,'2025-12-24 08:13:54'),('P-1766564034118-256-no8ou','FOLLEY BALOON CATHETER 2 WAY 18','FOLLEY BALOON CATHETER 2 WAY 18','General',995.44,1.00,'Box',508,0,'2025-12-24 08:13:54'),('P-1766564034118-257-36mmg','FREE STYLE PAD KUBWA','FREE STYLE PAD KUBWA','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-258-9p9vq','FREE STYLE PAD NDOGO','FREE STYLE PAD NDOGO','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-259-nrfqt','FUNGISTAT CREAM TUBE','FUNGISTAT CREAM TUBE','General',1.00,1.00,'Box',264,0,'2025-12-24 08:13:54'),('P-1766564034118-260-zfdkh','FURAZOL SYRUP','FURAZOL SYRUP','General',0.00,5.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-261-f1yn8','FURAZOLE TABS','FURAZOLE TABS','General',2.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-262-axff2','FUROSEMIDE INJECTION','FUROSEMIDE INJECTION','General',350.26,600.00,'Box',397,0,'2025-12-24 08:13:54'),('P-1766564034118-263-cvrad','FUROSEMIDE TAB PKT','FUROSEMIDE TAB PKT','General',2.00,2.00,'Box',196,0,'2025-12-24 08:13:54'),('P-1766564034118-264-lmmt2','FUSIDIC ACID TUBE','FUSIDIC ACID TUBE','General',3.00,5.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-265-wfdlt','GAUZE BANDAGE 15 CM 12s','GAUZE BANDAGE 15 CM 12s','General',252.02,300.00,'Box',703,0,'2025-12-24 08:13:54'),('P-1766564034118-266-3rrci','GAUZE BANDAGE 7.5 CM 12s','GAUZE BANDAGE 7.5 CM 12s','General',104.17,130.00,'Box',523,0,'2025-12-24 08:13:54'),('P-1766564034118-267-censm','GAUZE KUBWA','GAUZE KUBWA','General',17.00,29.00,'Box',19,0,'2025-12-24 08:13:54'),('P-1766564034118-268-kfpcy','GENTALENE C CREAM TUBE','GENTALENE C CREAM TUBE','General',2.00,3.00,'Box',33,0,'2025-12-24 08:13:54'),('P-1766564034118-269-8qv7u','GENTAMYCIN EYE DROP BOTTLE','GENTAMYCIN EYE DROP BOTTLE','General',300.00,450.00,'Box',85,0,'2025-12-24 08:13:54'),('P-1766564034118-270-df0nt','GENTAMYCIN INJ 80MG AMP','GENTAMYCIN INJ 80MG AMP','General',130.00,240.00,'Box',2,0,'2025-12-24 08:13:54'),('P-1766564034118-271-zb1t1','GENTIAN VIOLET GV BOTTLE','GENTIAN VIOLET GV BOTTLE','General',482.26,900.00,'Box',77,0,'2025-12-24 08:13:54'),('P-1766564034118-272-jramj','GENTRIDERM CREAM TUBE','GENTRIDERM CREAM TUBE','General',2.00,2.00,'Box',50,0,'2025-12-24 08:13:54'),('P-1766564034118-273-2o9gs','GENTRISONE CREAM TUBE','GENTRISONE CREAM TUBE','General',2.00,3.00,'Box',87,0,'2025-12-24 08:13:54'),('P-1766564034118-274-xfrtv','GLIBENCLAMIDE TAB PACKET','GLIBENCLAMIDE TAB PACKET','General',2.00,2.00,'Box',19,0,'2025-12-24 08:13:54'),('P-1766564034118-275-ovaqc','GLOVES EXAMINATION','GLOVES EXAMINATION','General',6.00,7.00,'Box',96,0,'2025-12-24 08:13:54'),('P-1766564034118-276-2laet','GLOVES SURGICAL 1PAIR','GLOVES SURGICAL 1PAIR','General',300.00,500.00,'Box',35,0,'2025-12-24 08:13:54'),('P-1766564034118-277-d2507','GLUCOPLUS MACHINE NO STRIPS','GLUCOPLUS MACHINE NO STRIPS','General',33.00,40.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034118-278-mczyn','GLUCOPLUS STRIPS 25\'S','GLUCOPLUS STRIPS 25\'S','General',15.00,22.00,'Box',4,0,'2025-12-24 08:13:54'),('P-1766564034118-279-rfr0m','GLUCOSE 50G','GLUCOSE 50G','General',305.56,390.00,'Box',472,0,'2025-12-24 08:13:54'),('P-1766564034118-280-olbsw','GLUCOSE 80G','GLUCOSE 80G','General',389.98,450.00,'Box',363,0,'2025-12-24 08:13:54'),('P-1766564034118-281-kj5tg','GOFEN 200MG(IBUPROFEN)','GOFEN 200MG(IBUPROFEN)','General',12.00,16.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-282-06z18','GOFEN 400MG(IBUPROFEN)','GOFEN 400MG(IBUPROFEN)','General',31.00,33.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034118-283-lbt7q','GOODMORNING LOZENGE PACKET','GOODMORNING LOZENGE PACKET','General',7.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-284-mjalq','GOODMORNING SYRUP BOTTLE','GOODMORNING SYRUP BOTTLE','General',1.00,1.00,'Box',361,0,'2025-12-24 08:13:54'),('P-1766564034118-285-2iox7','GRIPE WATER BABY 100ML BOTTLE','GRIPE WATER BABY 100ML BOTTLE','General',853.15,1.00,'Box',7,0,'2025-12-24 08:13:54'),('P-1766564034118-286-egzti','GRIPEWATER WWODWARD\'S','GRIPEWATER WWODWARD\'S','General',1.00,2.00,'Box',330,0,'2025-12-24 08:13:54'),('P-1766564034118-287-q1ft8','GRISEOFLUVIN TAB 500MG PKT','GRISEOFLUVIN TAB 500MG PKT','General',15.00,19.00,'Box',130,0,'2025-12-24 08:13:54'),('P-1766564034118-288-xcnjv','GYNAZOLE CREAM TUBE','GYNAZOLE CREAM TUBE','General',4.00,5.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-289-qdfle','GYNAZOLE PESSARY 3s PACKET','GYNAZOLE PESSARY 3s PACKET','General',5.00,5.00,'Box',297,0,'2025-12-24 08:13:54'),('P-1766564034118-290-1col1','HALOPERIDOL TAB','HALOPERIDOL TAB','General',6.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-291-1jw11','HEDAPAN TABS','HEDAPAN TABS','General',0.00,4.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-292-s5p43','HEDEX TABS PACKET','HEDEX TABS PACKET','General',7.00,8.00,'Box',49,0,'2025-12-24 08:13:54'),('P-1766564034118-293-cjhy3','HEDON TABS PACKET','HEDON TABS PACKET','General',3.00,4.00,'Box',83,0,'2025-12-24 08:13:54'),('P-1766564034118-294-pfbod','HEKOTOS COUGH LOZENGES','HEKOTOS COUGH LOZENGES','General',7.00,8.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-295-z6m62','HELIGO KIT TABS 42s PACKET','HELIGO KIT TABS 42s PACKET','General',20.00,28.00,'Box',147,0,'2025-12-24 08:13:54'),('P-1766564034118-296-2phfr','HEMOVIT CAPS 30\'S','HEMOVIT CAPS 30\'S','General',2.00,4.00,'Box',2,0,'2025-12-24 08:13:54'),('P-1766564034118-297-i59lk','HEMOVIT SYRUP 200ML BOTTLE','HEMOVIT SYRUP 200ML BOTTLE','General',3.00,4.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-298-h8qox','HIV KIT','HIV KIT','General',12.00,14.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-299-al0uh','HOMADEX TABS ACKET','HOMADEX TABS ACKET','General',6.00,8.00,'Box',277,0,'2025-12-24 08:13:54'),('P-1766564034118-300-vb99x','HQ PAD 290MM','HQ PAD 290MM','General',3.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-301-ydy17','HQ PAD 338MM','HQ PAD 338MM','General',3.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-302-hid7w','HYDRALAZINE TAB','HYDRALAZINE TAB','General',13.00,15.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-303-yy9vx','HYDROCORTISINE EYE DROPS','HYDROCORTISINE EYE DROPS','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-304-m2hqc','HYDROCORTISINE INJ 100MG','HYDROCORTISINE INJ 100MG','General',800.00,1.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034118-305-j52zu','HYDROGEN PEROXIDE 3% BOTTLE','HYDROGEN PEROXIDE 3% BOTTLE','General',350.24,650.00,'Box',848,0,'2025-12-24 08:13:54'),('P-1766564034118-306-xr0bl','HYDROGEN PEROXIDE 6%','HYDROGEN PEROXIDE 6%','General',350.10,600.00,'Box',339,0,'2025-12-24 08:13:54'),('P-1766564034118-307-lci0b','HYDROGEN PEROXIDE EAR DROP BTL','HYDROGEN PEROXIDE EAR DROP BTL','General',750.00,1.00,'Box',156,0,'2025-12-24 08:13:54'),('P-1766564034118-308-yol6l','HYDROXUREA 500MG','HYDROXUREA 500MG','General',37.00,40.00,'Box',20,0,'2025-12-24 08:13:54'),('P-1766564034118-309-rldo6','HYOSCINE  TAB','HYOSCINE  TAB','General',6.00,12.00,'Box',41,0,'2025-12-24 08:13:54'),('P-1766564034118-310-tms6i','I.V PARACETAMOL','I.V PARACETAMOL','General',1.00,2.00,'Box',351,0,'2025-12-24 08:13:54'),('P-1766564034118-311-pbtp6','IBUPROFEN SYRUP BOTTLE','IBUPROFEN SYRUP BOTTLE','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-312-sgwc9','IBUPROFEN TABS PKT','IBUPROFEN TABS PKT','General',1.00,2.00,'Box',120,0,'2025-12-24 08:13:54'),('P-1766564034118-313-lbuuz','ILET B2','ILET B2','General',5.00,9.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-314-k4m9c','IMIQUAD CREAM','IMIQUAD CREAM','General',13.00,14.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-315-0a4m8','INDOMETHACIN CAPS  PACKET','INDOMETHACIN CAPS  PACKET','General',3.00,4.00,'Box',74,0,'2025-12-24 08:13:54'),('P-1766564034118-316-dxdo9','INFLAZONE GEL TUBE','INFLAZONE GEL TUBE','General',2.00,2.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034118-317-n1pl5','INSULIN LENTE','INSULIN LENTE','General',9.00,11.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-318-6v1bv','INSULIN MIXTARD','INSULIN MIXTARD','General',8.00,11.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-319-vglv8','INSULIN SOLUBLE','INSULIN SOLUBLE','General',7.00,11.00,'Box',168,0,'2025-12-24 08:13:54'),('P-1766564034118-320-t4at5','IODINE TOPICAL BOTTLE','IODINE TOPICAL BOTTLE','General',905.37,1.00,'Box',434,0,'2025-12-24 08:13:54'),('P-1766564034118-321-o8pne','ISOSORBIDE DINITRATE TAB','ISOSORBIDE DINITRATE TAB','General',6.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-322-5a0xt','ISOSORBIDE MONONITRATE TAB','ISOSORBIDE MONONITRATE TAB','General',22.00,24.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-323-g11fo','ITRACONAZOLE 4\'S CAPS','ITRACONAZOLE 4\'S CAPS','General',2.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-324-l8r1t','IV GIVING SET','IV GIVING SET','General',307.36,500.00,'Box',5,0,'2025-12-24 08:13:54'),('P-1766564034118-325-qdsyt','IVYTUS SYRUP BOTTLE','IVYTUS SYRUP BOTTLE','General',0.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-326-bqaf6','JOINT SUPPORT TAB 30\'S','JOINT SUPPORT TAB 30\'S','General',538.89,550.00,'Box',210,0,'2025-12-24 08:13:54'),('P-1766564034118-327-24lyr','JUNIOR CARE SYRUP BOTTLE','JUNIOR CARE SYRUP BOTTLE','General',1.00,2.00,'Box',172,0,'2025-12-24 08:13:54'),('P-1766564034118-328-8y994','KAMAGRA CT 100MG','KAMAGRA CT 100MG','General',1.00,2.00,'Box',21,0,'2025-12-24 08:13:54'),('P-1766564034118-329-x4095','KETAMINE INJECTION','KETAMINE INJECTION','General',6.00,8.00,'Box',17,0,'2025-12-24 08:13:54'),('P-1766564034118-330-412d7','KETOGESIC CAPS PACKET','KETOGESIC CAPS PACKET','General',0.00,6.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-331-nji5v','KETOKONAZOLE CREAM TUBE 15G','KETOKONAZOLE CREAM TUBE 15G','General',932.93,1.00,'Box',41,0,'2025-12-24 08:13:54'),('P-1766564034118-332-qfxgo','KINHEAL CREAM','KINHEAL CREAM','General',2.00,2.00,'Box',345,0,'2025-12-24 08:13:54'),('P-1766564034118-333-5uhgi','KNEE WRAP WITH LOOP ELASTIC TEC','KNEE WRAP WITH LOOP ELASTIC TEC','General',15.00,22.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034118-334-8z1mj','KOFLAME TABS  PACKET 10\'S','KOFLAME TABS  PACKET 10\'S','General',1.00,1.00,'Box',495,0,'2025-12-24 08:13:54'),('P-1766564034118-335-6cngo','KOFLYN SYRUP ADULT BOTTLE','KOFLYN SYRUP ADULT BOTTLE','General',1.00,1.00,'Box',585,0,'2025-12-24 08:13:54'),('P-1766564034119-336-jihac','KOFLYN SYRUP CHILD BOTTLE','KOFLYN SYRUP CHILD BOTTLE','General',1.00,1.00,'Box',2,0,'2025-12-24 08:13:54'),('P-1766564034119-337-c0cgd','KOFOL SYRUP','KOFOL SYRUP','General',949.04,1.00,'Box',19,0,'2025-12-24 08:13:54'),('P-1766564034119-338-4sbr3','KY GEL','KY GEL','General',4.00,7.00,'Box',67,0,'2025-12-24 08:13:54'),('P-1766564034119-339-idmpp','LACTOGEN 1 FORMULAR 400G','LACTOGEN 1 FORMULAR 400G','General',18.00,25.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-340-w177i','LACTULOSE 100ML BOTT','LACTULOSE 100ML BOTT','General',3.00,3.00,'Box',69,0,'2025-12-24 08:13:54'),('P-1766564034119-341-dolpg','LAEFIN TAB PACKET','LAEFIN TAB PACKET','General',656.64,850.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-342-4x2sd','LANSOPRAZOLE CAP 30\'s','LANSOPRAZOLE CAP 30\'s','General',5.00,4.00,'Box',296,0,'2025-12-24 08:13:54'),('P-1766564034119-343-8ayyi','LEVAMISOLE SYRUP BOTTLE','LEVAMISOLE SYRUP BOTTLE','General',900.39,1.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-344-09fq0','LEVAMISOLE TAB 3s PACK','LEVAMISOLE TAB 3s PACK','General',3.00,4.00,'Box',40,0,'2025-12-24 08:13:54'),('P-1766564034119-345-cthm8','LEVOFLOXACIN TAB 10\'S','LEVOFLOXACIN TAB 10\'S','General',4.00,6.00,'Box',224,0,'2025-12-24 08:13:54'),('P-1766564034119-346-mwdt0','LIGNOCAINE INJ.','LIGNOCAINE INJ.','General',548.34,1.00,'Box',331,0,'2025-12-24 08:13:54'),('P-1766564034119-347-f8rt2','LINCODERM CREAM TUBE','LINCODERM CREAM TUBE','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-348-3rll6','LOPERAMIDE TAB','LOPERAMIDE TAB','General',6.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-349-hjecq','LORATADINE SYRUP','LORATADINE SYRUP','General',5.00,6.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-350-jkiz0','LORATIDINE TAB 100\'S','LORATIDINE TAB 100\'S','General',6.00,7.00,'Box',51,0,'2025-12-24 08:13:54'),('P-1766564034119-351-85cur','LOSARTAN-HYDROCHLOROTHIAZIDE TB','LOSARTAN-HYDROCHLOROTHIAZIDE TB','General',2.00,3.00,'Box',354,0,'2025-12-24 08:13:54'),('P-1766564034119-352-vrqia','LOSARTAN TAB 50MG','LOSARTAN TAB 50MG','General',2.00,2.00,'Box',196,0,'2025-12-24 08:13:54'),('P-1766564034119-353-gsdbd','LUCIN CREAM TUBE','LUCIN CREAM TUBE','General',1.00,1.00,'Box',501,0,'2025-12-24 08:13:54'),('P-1766564034119-354-5v6dt','LUCIN OINTMENT TUBE','LUCIN OINTMENT TUBE','General',1.00,1.00,'Box',240,0,'2025-12-24 08:13:54'),('P-1766564034119-355-niqkp','LUMERAX/LONART-DS 6TAB','LUMERAX/LONART-DS 6TAB','General',2.00,3.00,'Box',58,0,'2025-12-24 08:13:54'),('P-1766564034119-356-f9613','M2 TONE TAB 60\'S','M2 TONE TAB 60\'S','General',10.00,18.00,'Box',36,0,'2025-12-24 08:13:54'),('P-1766564034119-357-nlw5z','MAGNESIUM TAB BLISTER 100\'S MAG','MAGNESIUM TAB BLISTER 100\'S MAG','General',1.00,1.00,'Box',927,0,'2025-12-24 08:13:54'),('P-1766564034119-358-cmpbr','MAJI MADOGO','MAJI MADOGO','General',375.00,400.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-359-r5uq0','MAJI MAKUBWA','MAJI MAKUBWA','General',833.05,800.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-360-f8996','MALAFIN 1PKT','MALAFIN 1PKT','General',600.06,790.00,'Box',3,0,'2025-12-24 08:13:54'),('P-1766564034119-361-e7c5s','MARAMOL TABS PACKET','MARAMOL TABS PACKET','General',0.00,8.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-362-xvbm4','MEBENDAZOLE 1TAB','MEBENDAZOLE 1TAB','General',2.00,2.00,'Box',65,0,'2025-12-24 08:13:54'),('P-1766564034119-363-47h64','MEBENDAZOLE SYRUP BOTTLE','MEBENDAZOLE SYRUP BOTTLE','General',750.67,1.00,'Box',3,0,'2025-12-24 08:13:54'),('P-1766564034119-364-zirqf','MEBO OINTMENT TUBE','MEBO OINTMENT TUBE','General',4.00,16.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-365-pf9nc','MEDI-ORAL BOTTLE','MEDI-ORAL BOTTLE','General',2.00,2.00,'Box',130,0,'2025-12-24 08:13:54'),('P-1766564034119-366-v4hz6','MEDIPLAST','MEDIPLAST','General',2.00,2.00,'Box',4,0,'2025-12-24 08:13:54'),('P-1766564034119-367-hemck','MEDIVEN CREAM TUBE','MEDIVEN CREAM TUBE','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-368-n092o','MEDIVEN OINTMENT TUBE','MEDIVEN OINTMENT TUBE','General',1.00,1.00,'Box',34,0,'2025-12-24 08:13:54'),('P-1766564034119-369-rlvsl','MEFENAMIC ACID TAB PKT','MEFENAMIC ACID TAB PKT','General',5.00,6.00,'Box',11,0,'2025-12-24 08:13:54'),('P-1766564034119-370-6tk8t','MELOXICAM TAB 15MG','MELOXICAM TAB 15MG','General',8.00,12.00,'Box',14,0,'2025-12-24 08:13:54'),('P-1766564034119-371-etxr7','MENTHO PLUS KUBWA','MENTHO PLUS KUBWA','General',0.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-372-h6d8p','MENTHO PLUS NDOGO','MENTHO PLUS NDOGO','General',0.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-373-lxms4','MENTHODEX LOZENGES 6s PACKET','MENTHODEX LOZENGES 6s PACKET','General',3.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-374-l23jm','MENTHODEX SYRUP 100MLS BOTTLE','MENTHODEX SYRUP 100MLS BOTTLE','General',6.00,6.00,'Box',241,0,'2025-12-24 08:13:54'),('P-1766564034119-375-r4cqb','METFORMIN TAB PACKET','METFORMIN TAB PACKET','General',2.00,3.00,'Box',19,0,'2025-12-24 08:13:54'),('P-1766564034119-376-bs7a9','METHYLATED SPIRIT 100ML','METHYLATED SPIRIT 100ML','General',403.68,650.00,'Box',454,0,'2025-12-24 08:13:54'),('P-1766564034119-377-d7azx','METHYLCELLULOSE EYE DROP','METHYLCELLULOSE EYE DROP','General',3.00,4.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-378-6v573','METHYLDOPA TAB PACKET','METHYLDOPA TAB PACKET','General',9.00,12.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-379-vvhct','METOCLOPOPAMIDE INJ','METOCLOPOPAMIDE INJ','General',395.00,650.00,'Box',2,0,'2025-12-24 08:13:54'),('P-1766564034119-380-d2qcl','METOCLOPOPAMIDE TAB','METOCLOPOPAMIDE TAB','General',8.00,11.00,'Box',3,0,'2025-12-24 08:13:54'),('P-1766564034119-381-8m61l','METOPROLOL TABS','METOPROLOL TABS','General',8.00,9.00,'Box',80,0,'2025-12-24 08:13:54'),('P-1766564034119-382-b96oy','METRO ORAL GEL (DENTA) TUBE','METRO ORAL GEL (DENTA) TUBE','General',3.00,3.00,'Box',132,0,'2025-12-24 08:13:54'),('P-1766564034119-383-qt7gu','METRO SKIN GEL TUBE','METRO SKIN GEL TUBE','General',3.00,3.00,'Box',72,0,'2025-12-24 08:13:54'),('P-1766564034119-384-ihqrt','METROGYL TAB COATED','METROGYL TAB COATED','General',1.00,1.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-385-ctv57','METRONIDAZOLE INJ','METRONIDAZOLE INJ','General',550.00,950.00,'Box',614,0,'2025-12-24 08:13:54'),('P-1766564034119-386-e6gu4','METRONIDAZOLE SYRUP 100ML BOTTL','METRONIDAZOLE SYRUP 100ML BOTTL','General',946.51,1.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-387-4ru97','METRONIDAZOLE TAB NOT COATED','METRONIDAZOLE TAB NOT COATED','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-388-2vidr','MICONAZOLE CREAM OTHERSLOW PRIC','MICONAZOLE CREAM OTHERSLOW PRIC','General',665.00,790.00,'Box',392,0,'2025-12-24 08:13:54'),('P-1766564034119-389-tqpgn','MICONAZOLE ORAL GEL TUBE','MICONAZOLE ORAL GEL TUBE','General',2.00,2.00,'Box',251,0,'2025-12-24 08:13:54'),('P-1766564034119-390-rm1b7','MIFUPEN TAB  PACKET','MIFUPEN TAB  PACKET','General',4.00,5.00,'Box',25,0,'2025-12-24 08:13:54'),('P-1766564034119-391-zs3am','MISWAKI 550','MISWAKI 550','General',417.00,550.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-392-hr7rt','MISWAKI YA 2,000/=','MISWAKI YA 2,000/=','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-393-n2wv7','MISWAKI YA SH 500','MISWAKI YA SH 500','General',183.00,250.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-394-zqbgv','MONTELUKAST TAB 10MG','MONTELUKAST TAB 10MG','General',7.00,12.00,'Box',33,0,'2025-12-24 08:13:54'),('P-1766564034119-395-zdqsz','MOSQUITOR REPELANT FAMILY 100ML','MOSQUITOR REPELANT FAMILY 100ML','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-396-38bif','MOSQUITOR REPELANT FAMILY 70ML','MOSQUITOR REPELANT FAMILY 70ML','General',648.04,950.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-397-2i5ys','MRDT KIT','MRDT KIT','General',13.00,16.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-398-5tmxv','MUCKINTOSH PER 1METRE','MUCKINTOSH PER 1METRE','General',3.00,4.00,'Box',206,0,'2025-12-24 08:13:54'),('P-1766564034119-399-yn676','MUCOGEL SYRUP BOTTLE','MUCOGEL SYRUP BOTTLE','General',3.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-400-goak7','MUCOLYN SYRUP ADULT BOTTLE','MUCOLYN SYRUP ADULT BOTTLE','General',1.00,1.00,'Box',480,0,'2025-12-24 08:13:54'),('P-1766564034119-401-phi3k','MUCOLYN SYRUP CHILD BOTTLE','MUCOLYN SYRUP CHILD BOTTLE','General',1.00,1.00,'Box',459,0,'2025-12-24 08:13:54'),('P-1766564034119-402-2gptu','MULTIVITAMIN SYRUP 100ML BOTTLE','MULTIVITAMIN SYRUP 100ML BOTTLE','General',1.00,1.00,'Box',18,0,'2025-12-24 08:13:54'),('P-1766564034119-403-fzht6','MULTIVITAMIN TAB PKT','MULTIVITAMIN TAB PKT','General',6.00,9.00,'Box',134,0,'2025-12-24 08:13:54'),('P-1766564034119-404-sa9m5','MUPIROCIN OINTMENT','MUPIROCIN OINTMENT','General',2.00,3.00,'Box',25,0,'2025-12-24 08:13:54'),('P-1766564034119-405-ymx3b','MUSCLE PLUS TAB 20\'S PKT','MUSCLE PLUS TAB 20\'S PKT','General',2.00,3.00,'Box',191,0,'2025-12-24 08:13:54'),('P-1766564034119-406-asj5m','N.S NASAL SPRAY','N.S NASAL SPRAY','General',1.00,1.00,'Box',114,0,'2025-12-24 08:13:54'),('P-1766564034119-407-bvobx','NASAL GASTRIC FEEDING TUBE 10','NASAL GASTRIC FEEDING TUBE 10','General',536.12,800.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-408-mgoy7','NASAL GASTRIC FEEDING TUBE 16','NASAL GASTRIC FEEDING TUBE 16','General',850.00,1.00,'Box',180,0,'2025-12-24 08:13:54'),('P-1766564034119-409-e2hbo','NASAL GASTRIC FEEDING TUBE 18','NASAL GASTRIC FEEDING TUBE 18','General',550.00,800.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-410-atyd5','NAT B TAB','NAT B TAB','General',11.00,12.00,'Box',6,0,'2025-12-24 08:13:54'),('P-1766564034119-411-5qvre','NATURAL TEARS DROP','NATURAL TEARS DROP','General',8.00,8.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-412-3qdo4','NAUMA GEL','NAUMA GEL','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-413-w6vsj','NEURO FORTE TABS','NEURO FORTE TABS','General',6.00,6.00,'Box',104,0,'2025-12-24 08:13:54'),('P-1766564034119-414-j1iyy','NEURO SUPPORT TAB','NEURO SUPPORT TAB','General',378.98,450.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-415-74dp0','NEUROBION FORTE 30\'S TAB','NEUROBION FORTE 30\'S TAB','General',2.00,3.00,'Box',43,0,'2025-12-24 08:13:54'),('P-1766564034119-416-2b5zp','NEUROTON TAB','NEUROTON TAB','General',10.00,13.00,'Box',65,0,'2025-12-24 08:13:54'),('P-1766564034119-417-glqo0','NIFEDIPINE TAB','NIFEDIPINE TAB','General',2.00,3.00,'Box',28,0,'2025-12-24 08:13:54'),('P-1766564034119-418-34qjh','NITAZOXANIDE TABS 500MG','NITAZOXANIDE TABS 500MG','General',4.00,6.00,'Box',80,0,'2025-12-24 08:13:54'),('P-1766564034119-419-m48hh','NITROFURANTOIN TAB','NITROFURANTOIN TAB','General',5.00,6.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-420-vqtbd','NJOI TAB PACKET','NJOI TAB PACKET','General',300.00,600.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-421-zytrs','NOR-T TAB 10\'S','NOR-T TAB 10\'S','General',1.00,1.00,'Box',949,0,'2025-12-24 08:13:54'),('P-1766564034119-422-jlewn','NORETHISTERONE TAB 30\'S','NORETHISTERONE TAB 30\'S','General',6.00,8.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-423-jx8cs','NORFLOXACIN TAB','NORFLOXACIN TAB','General',17.00,19.00,'Box',510,0,'2025-12-24 08:13:54'),('P-1766564034119-424-k16sa','NORMAL SALINE  (N.S) BOTTLE','NORMAL SALINE  (N.S) BOTTLE','General',942.13,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-425-ajxrf','NORZOLE TAB BOX 10\'S','NORZOLE TAB BOX 10\'S','General',1.00,2.00,'Box',32,0,'2025-12-24 08:13:54'),('P-1766564034119-426-ijf4u','NYLON SIZE 2','NYLON SIZE 2','General',1.00,2.00,'Box',12,0,'2025-12-24 08:13:54'),('P-1766564034119-427-1mskh','NYSTATIN PESSARIES','NYSTATIN PESSARIES','General',1.00,1.00,'Box',5,0,'2025-12-24 08:13:54'),('P-1766564034119-428-olypo','NYSTATIN SUSPENSION ORAL BOTTLE','NYSTATIN SUSPENSION ORAL BOTTLE','General',1.00,1.00,'Box',204,0,'2025-12-24 08:13:54'),('P-1766564034119-429-7o50r','NYSTATIN TAB','NYSTATIN TAB','General',17.00,23.00,'Box',4,0,'2025-12-24 08:13:54'),('P-1766564034119-430-99zyd','OMEPRAZOLE CAP','OMEPRAZOLE CAP','General',2.00,3.00,'Box',133,0,'2025-12-24 08:13:54'),('P-1766564034119-431-t4yf8','OMEPRAZOLE INJ','OMEPRAZOLE INJ','General',3.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-432-jye5h','OPELELOTION BOTTLE','OPELELOTION BOTTLE','General',2.00,3.00,'Box',76,0,'2025-12-24 08:13:54'),('P-1766564034119-433-el0dn','ORACURE GEL','ORACURE GEL','General',4.00,5.00,'Box',7,0,'2025-12-24 08:13:54'),('P-1766564034119-434-utd28','ORNIDAZOLE TABS 500MG','ORNIDAZOLE TABS 500MG','General',36.00,47.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-435-ykii7','ORODAR TAB 3s PACKET','ORODAR TAB 3s PACKET','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-436-pnqts','ORS SACHET','ORS SACHET','General',180.00,220.00,'Box',11,0,'2025-12-24 08:13:54'),('P-1766564034119-437-0p1w9','OSTEOMIN TABS 30\'s','OSTEOMIN TABS 30\'s','General',18.00,35.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-438-ns3g0','OXYTOCIN INJ','OXYTOCIN INJ','General',950.00,1.00,'Box',234,0,'2025-12-24 08:13:54'),('P-1766564034119-439-1tt2x','P.O.P 15CM','P.O.P 15CM','General',1.00,1.00,'Box',122,0,'2025-12-24 08:13:54'),('P-1766564034119-440-7siyy','P2 BRAND','P2 BRAND','General',1.00,1.00,'Box',300,0,'2025-12-24 08:13:54'),('P-1766564034119-441-i9i5f','P2 TAB PACKET 1/P','P2 TAB PACKET 1/P','General',759.25,1.00,'Box',2,0,'2025-12-24 08:13:54'),('P-1766564034119-442-0uwyj','P2 TABS 2/P','P2 TABS 2/P','General',1.00,1.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-443-bw24o','PACIFY ORGANIC PADS','PACIFY ORGANIC PADS','General',2.00,3.00,'Box',48,0,'2025-12-24 08:13:54'),('P-1766564034119-444-9js14','PAMBA STICK EAR 1000','PAMBA STICK EAR 1000','General',500.00,750.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-445-j1xxa','PAMBA STICK EAR 500','PAMBA STICK EAR 500','General',375.00,350.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-446-293ly','PAMPERS 0-6KG [14]','PAMPERS 0-6KG [14]','General',3.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-447-99ndh','PAMPERS 0-6KG[48]','PAMPERS 0-6KG[48]','General',0.00,15.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-448-yc0pu','PAMPERS 6-9 [12]','PAMPERS 6-9 [12]','General',2.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-449-0m7fs','PAMPERS 6-9KG[42]','PAMPERS 6-9KG[42]','General',0.00,15.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-450-61rd2','PAMPERS 9-15[40]','PAMPERS 9-15[40]','General',375.00,15.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-451-n53y3','PAMPERS 9-15KG[10]','PAMPERS 9-15KG[10]','General',3.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-452-9ewk5','PANADOL ADVANCE TAB','PANADOL ADVANCE TAB','General',5.00,8.00,'Box',133,0,'2025-12-24 08:13:54'),('P-1766564034119-453-8z7rm','PANADOL EXTRA TAB','PANADOL EXTRA TAB','General',9.00,11.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-454-euxx5','PANTOPRAZOLE INJ','PANTOPRAZOLE INJ','General',2.00,4.00,'Box',167,0,'2025-12-24 08:13:54'),('P-1766564034119-455-vivkm','PANTOPRAZOLE TAB 30\'S','PANTOPRAZOLE TAB 30\'S','General',3.00,4.00,'Box',202,0,'2025-12-24 08:13:54'),('P-1766564034119-456-qrfvq','PARACETAMOL SUPPOSITORIES 10\'s','PARACETAMOL SUPPOSITORIES 10\'s','General',5.00,6.00,'Box',9,0,'2025-12-24 08:13:54'),('P-1766564034119-457-uc25s','PARACETAMOL SYRUP BOTTLE','PARACETAMOL SYRUP BOTTLE','General',840.58,1.00,'Box',9,0,'2025-12-24 08:13:54'),('P-1766564034119-458-l1flc','PARACETAMOL TABS PACKET','PARACETAMOL TABS PACKET','General',1.00,1.00,'Box',2,0,'2025-12-24 08:13:54'),('P-1766564034119-459-qn9cz','PARAFIN GAUZE','PARAFIN GAUZE','General',600.00,1.00,'Box',460,0,'2025-12-24 08:13:54'),('P-1766564034119-460-aalo7','PEDZINC SYRUP BOTTLE','PEDZINC SYRUP BOTTLE','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-461-850e9','PEDZINC TAB PACKET','PEDZINC TAB PACKET','General',498.89,600.00,'Box',146,0,'2025-12-24 08:13:54'),('P-1766564034119-462-a3qhi','PEN V SYRUP 100ML BOTTLE','PEN V SYRUP 100ML BOTTLE','General',2.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-463-aluy7','PEN V TAB PACKET','PEN V TAB PACKET','General',4.00,6.00,'Box',76,0,'2025-12-24 08:13:54'),('P-1766564034119-464-sau9m','PERSOL 2.5 GEL TUBE','PERSOL 2.5 GEL TUBE','General',3.00,3.00,'Box',39,0,'2025-12-24 08:13:54'),('P-1766564034119-465-rhea2','PERSOL 5 GEL TUBE','PERSOL 5 GEL TUBE','General',3.00,3.00,'Box',66,0,'2025-12-24 08:13:54'),('P-1766564034119-466-g4g4c','PERSOL FORTE TUBE','PERSOL FORTE TUBE','General',3.00,4.00,'Box',379,0,'2025-12-24 08:13:54'),('P-1766564034119-467-az6rg','PHAMACTIN SYRUP 100ML BOTTLE','PHAMACTIN SYRUP 100ML BOTTLE','General',2.00,2.00,'Box',54,0,'2025-12-24 08:13:54'),('P-1766564034119-468-juxvd','PHENOBABITONE INJECTION','PHENOBABITONE INJECTION','General',3.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-469-mg2iu','PHENOBARBITONE TAB 30MG PKT','PHENOBARBITONE TAB 30MG PKT','General',3.00,4.00,'Box',17,0,'2025-12-24 08:13:54'),('P-1766564034119-470-thbyq','PIRITON SYRUP BOTTLE','PIRITON SYRUP BOTTLE','General',1.00,1.00,'Box',291,0,'2025-12-24 08:13:54'),('P-1766564034119-471-bekgy','PIRITON TABS  PACKET','PIRITON TABS  PACKET','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-472-75mm4','PIROXICAM CAP PACKET','PIROXICAM CAP PACKET','General',2.00,3.00,'Box',966,0,'2025-12-24 08:13:54'),('P-1766564034119-473-go4m8','PIROXICAM GEL B.P','PIROXICAM GEL B.P','General',2.00,4.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-474-o4l20','PLASTER 1.25CM','PLASTER 1.25CM','General',520.00,700.00,'Box',202,0,'2025-12-24 08:13:54'),('P-1766564034119-475-7ovep','PLASTER 2.5 CM','PLASTER 2.5 CM','General',860.00,1.00,'Box',11,0,'2025-12-24 08:13:54'),('P-1766564034119-476-ydol8','PLASTER 5 CM','PLASTER 5 CM','General',1.00,1.00,'Box',69,0,'2025-12-24 08:13:54'),('P-1766564034119-477-n74de','PLASTER 7.5 CM','PLASTER 7.5 CM','General',1.00,2.00,'Box',149,0,'2025-12-24 08:13:54'),('P-1766564034119-478-9z5oe','PODOPHYLLIN OINT.','PODOPHYLLIN OINT.','General',32.00,40.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-479-j3uai','POTTASIUM PERMANGANATE 100MLS','POTTASIUM PERMANGANATE 100MLS','General',510.74,800.00,'Box',102,0,'2025-12-24 08:13:54'),('P-1766564034119-480-baxvr','POVIDONE IODINE 250MLS','POVIDONE IODINE 250MLS','General',509.20,3.00,'Box',434,0,'2025-12-24 08:13:54'),('P-1766564034119-481-3f494','PPF INJ','PPF INJ','General',800.00,950.00,'Box',17,0,'2025-12-24 08:13:54'),('P-1766564034119-482-2b7li','PRAZIQUANTEL TAB 600MG','PRAZIQUANTEL TAB 600MG','General',30.00,34.00,'Box',3,0,'2025-12-24 08:13:54'),('P-1766564034119-483-4mk03','PREDNISOLONE EYE DROP','PREDNISOLONE EYE DROP','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-484-iv532','PREDNISOLONE TAB PACKET','PREDNISOLONE TAB PACKET','General',1.00,2.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-485-lxhrv','PREGABALIN 75MG TAB','PREGABALIN 75MG TAB','General',3.00,4.00,'Box',94,0,'2025-12-24 08:13:54'),('P-1766564034119-486-u8gds','PRINALYN ADULT SYRUP','PRINALYN ADULT SYRUP','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-487-zphoz','PRINALYN CHILD SYRUP','PRINALYN CHILD SYRUP','General',1.00,1.00,'Box',236,0,'2025-12-24 08:13:54'),('P-1766564034119-488-vdtc2','PROMETHAZINE INJECTION','PROMETHAZINE INJECTION','General',380.00,650.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-489-lsika','PROMETHAZINE SYRUP BOTTLE','PROMETHAZINE SYRUP BOTTLE','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-490-zsa3n','PROMETHAZINE TABS','PROMETHAZINE TABS','General',2.00,3.00,'Box',35,0,'2025-12-24 08:13:54'),('P-1766564034119-491-7amkk','PROPRANOLOL TAB','PROPRANOLOL TAB','General',9.00,10.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-492-eieh5','PROTEX SOAP 150G KUBWA','PROTEX SOAP 150G KUBWA','General',2.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-493-x2woj','PROTEX SOAP 90G NDOGO','PROTEX SOAP 90G NDOGO','General',1.00,1.00,'Box',228,0,'2025-12-24 08:13:54'),('P-1766564034119-494-cc5b7','PYRIDOXINE VITAMIN B6 60\'S','PYRIDOXINE VITAMIN B6 60\'S','General',15.00,19.00,'Box',14,0,'2025-12-24 08:13:54'),('P-1766564034119-495-6kth2','QUININE INJ 600MG','QUININE INJ 600MG','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-496-g5yzw','QUININE SYRUP 100ML BOTTLE','QUININE SYRUP 100ML BOTTLE','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-497-0j9qu','QUININE TAB','QUININE TAB','General',9.00,12.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-498-nzomf','RABEPRAZOLE 30MG TABS','RABEPRAZOLE 30MG TABS','General',2.00,1.00,'Box',45,0,'2025-12-24 08:13:54'),('P-1766564034119-499-leh5n','RELCER GEL 100ML','RELCER GEL 100ML','General',1.00,1.00,'Box',268,0,'2025-12-24 08:13:54'),('P-1766564034119-500-qr8ga','RELCER GEL 180ML','RELCER GEL 180ML','General',3.00,3.00,'Box',148,0,'2025-12-24 08:13:54'),('P-1766564034119-501-r9nlw','REPACE - H 30\'s','REPACE - H 30\'s','General',12.00,15.00,'Box',49,0,'2025-12-24 08:13:54'),('P-1766564034119-502-o7y5i','RINGER LACTATE (R.L)','RINGER LACTATE (R.L)','General',980.00,1.00,'Box',49,0,'2025-12-24 08:13:54'),('P-1766564034119-503-bu6h0','ROSUVASTATIN TABS 20MG','ROSUVASTATIN TABS 20MG','General',9.00,12.00,'Box',24,0,'2025-12-24 08:13:54'),('P-1766564034119-504-gx89t','ROUGH RIDER','ROUGH RIDER','General',2.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-505-7lsk1','SAFI CREAM TUBE','SAFI CREAM TUBE','General',2.00,2.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-506-x0961','SALBUTAMOL INHALER','SALBUTAMOL INHALER','General',3.00,3.00,'Box',273,0,'2025-12-24 08:13:54'),('P-1766564034119-507-5fle3','SALBUTAMOL SYRUP BOTTLE','SALBUTAMOL SYRUP BOTTLE','General',800.00,1.00,'Box',306,0,'2025-12-24 08:13:54'),('P-1766564034119-508-28din','SALBUTAMOL TAB  PACKET','SALBUTAMOL TAB  PACKET','General',1.00,1.00,'Box',189,0,'2025-12-24 08:13:54'),('P-1766564034119-509-90svs','SALIMIA LINIMENT 60MLS','SALIMIA LINIMENT 60MLS','General',2.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-510-3oo86','SCALP VEIN (BUTTERFLY)','SCALP VEIN (BUTTERFLY)','General',150.16,250.00,'Box',60,0,'2025-12-24 08:13:54'),('P-1766564034119-511-oyoz1','SCOTT\'S SYRUP ORANGE 100ML','SCOTT\'S SYRUP ORANGE 100ML','General',5.00,5.00,'Box',6,0,'2025-12-24 08:13:54'),('P-1766564034119-512-y99ey','SCOTT\'S SYRUP ORIGINAL 100ML','SCOTT\'S SYRUP ORIGINAL 100ML','General',5.00,5.00,'Box',60,0,'2025-12-24 08:13:54'),('P-1766564034119-513-teisl','SECNIDAZOLE TAB 2s PACKET','SECNIDAZOLE TAB 2s PACKET','General',800.00,1.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-514-uf2ea','SEDITON SYRUP GREEN BOTTLE','SEDITON SYRUP GREEN BOTTLE','General',2.00,2.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-515-bpuop','SEDITON SYRUP YELLOW BOTTLE','SEDITON SYRUP YELLOW BOTTLE','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-516-11n8c','SENSODYNE 100ML TUBE','SENSODYNE 100ML TUBE','General',6.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-517-d6cbk','SENSODYNE 40ML TUBE','SENSODYNE 40ML TUBE','General',4.00,4.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-518-zsu49','SENSODYNE 75ML TUBE','SENSODYNE 75ML TUBE','General',7.00,8.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-519-crvn7','SEPTRIN SYRUP 100ML BOTTLE','SEPTRIN SYRUP 100ML BOTTLE','General',880.00,1.00,'Box',721,0,'2025-12-24 08:13:54'),('P-1766564034119-520-p1nke','SEPTRIN TAB KIJANI','SEPTRIN TAB KIJANI','General',3.00,4.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-521-tl5l0','SEPTRIN TAB PKT','SEPTRIN TAB PKT','General',2.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-522-0lu7l','SILK','SILK','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-523-m86c3','SILVER NITRIC PENCIL','SILVER NITRIC PENCIL','General',7.00,8.00,'Box',63,0,'2025-12-24 08:13:54'),('P-1766564034119-524-f0u3j','SILVERKANT CREAM 15MG TUBE','SILVERKANT CREAM 15MG TUBE','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-525-f5ho3','SITCOM CREAM','SITCOM CREAM','General',11.00,13.00,'Box',3,0,'2025-12-24 08:13:54'),('P-1766564034119-526-mq0c1','SITCOM TABS','SITCOM TABS','General',36.00,48.00,'Box',19,0,'2025-12-24 08:13:54'),('P-1766564034119-527-dv0aj','SKDERM CREAM 15G  TUBE','SKDERM CREAM 15G  TUBE','General',1.00,2.00,'Box',324,0,'2025-12-24 08:13:54'),('P-1766564034119-528-fbtjy','SKDERM CREAM 30G TUBE','SKDERM CREAM 30G TUBE','General',2.00,2.00,'Box',949,0,'2025-12-24 08:13:54'),('P-1766564034119-529-jg8sg','SKTONE 100MLS BOTTLE','SKTONE 100MLS BOTTLE','General',1.00,2.00,'Box',7,0,'2025-12-24 08:13:54'),('P-1766564034119-530-n5xwn','SKTONE 200ML BOTTLE','SKTONE 200ML BOTTLE','General',3.00,3.00,'Box',109,0,'2025-12-24 08:13:54'),('P-1766564034119-531-kkrcq','SODIUM CROMOGLYCATE EYE DROP','SODIUM CROMOGLYCATE EYE DROP','General',1.00,1.00,'Box',159,0,'2025-12-24 08:13:54'),('P-1766564034119-532-eupcg','SOFT CARE NDOGO','SOFT CARE NDOGO','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-533-k3xiv','SOFTCARE PAD KUBWA','SOFTCARE PAD KUBWA','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-534-hfs25','SONADERM CREAM 10G TUBE','SONADERM CREAM 10G TUBE','General',2.00,2.00,'Box',86,0,'2025-12-24 08:13:54'),('P-1766564034119-535-y02jv','SPIRIT 1 Lt','SPIRIT 1 Lt','General',3.00,3.00,'Box',23,0,'2025-12-24 08:13:54'),('P-1766564034119-536-dd33d','SPIRIT 500mls','SPIRIT 500mls','General',2.00,2.00,'Box',130,0,'2025-12-24 08:13:54'),('P-1766564034119-537-yotia','SPIRIT 5LT','SPIRIT 5LT','General',13.00,23.00,'Box',14,0,'2025-12-24 08:13:54'),('P-1766564034119-538-skxfa','SPIRONOLACTONE TAB 25MG','SPIRONOLACTONE TAB 25MG','General',5.00,7.00,'Box',4,0,'2025-12-24 08:13:54'),('P-1766564034119-539-70gxg','SULPHADAR TABS 3s PKT','SULPHADAR TABS 3s PKT','General',759.81,850.00,'Box',7,0,'2025-12-24 08:13:54'),('P-1766564034119-540-i91cp','SULPHUR OINTMENT TUBE','SULPHUR OINTMENT TUBE','General',853.56,1.00,'Box',117,0,'2025-12-24 08:13:54'),('P-1766564034119-541-oyrlj','SURGICAL BLADES 24G','SURGICAL BLADES 24G','General',10.00,14.00,'Box',3,0,'2025-12-24 08:13:54'),('P-1766564034119-542-dhr5x','SYRINGE 10CC','SYRINGE 10CC','General',140.00,170.00,'Box',49,0,'2025-12-24 08:13:54'),('P-1766564034119-543-sdrg6','SYRINGE 20 cc','SYRINGE 20 cc','General',465.00,550.00,'Box',140,0,'2025-12-24 08:13:54'),('P-1766564034119-544-ldaxb','SYRINGE 2CC','SYRINGE 2CC','General',85.00,100.00,'Box',80,0,'2025-12-24 08:13:54'),('P-1766564034119-545-vumm0','SYRINGE 50ML FEEDING','SYRINGE 50ML FEEDING','General',490.00,600.00,'Box',63,0,'2025-12-24 08:13:54'),('P-1766564034119-546-mzwkx','SYRINGE 5CC','SYRINGE 5CC','General',50.00,100.00,'Box',18,0,'2025-12-24 08:13:54'),('P-1766564034119-547-3wmj8','TAMSULOSINE TAB','TAMSULOSINE TAB','General',8.00,11.00,'Box',233,0,'2025-12-24 08:13:54'),('P-1766564034119-548-tac48','TASOL GM','TASOL GM','General',3.00,1.00,'Box',46,0,'2025-12-24 08:13:54'),('P-1766564034119-549-ibsg3','TELMISARTAN-H TABS 80MG 30\'S','TELMISARTAN-H TABS 80MG 30\'S','General',8.00,9.00,'Box',13,0,'2025-12-24 08:13:54'),('P-1766564034119-550-rui9i','TELMISARTAN TABS 40MG 30\'S','TELMISARTAN TABS 40MG 30\'S','General',6.00,8.00,'Box',66,0,'2025-12-24 08:13:54'),('P-1766564034119-551-ayo23','TELMISARTAN TABS 80MG','TELMISARTAN TABS 80MG','General',7.00,8.00,'Box',57,0,'2025-12-24 08:13:54'),('P-1766564034119-552-xqd5y','TERBINAFINE CREAM TUBE','TERBINAFINE CREAM TUBE','General',1.00,2.00,'Box',409,0,'2025-12-24 08:13:54'),('P-1766564034119-553-zyagk','TERMIDOL SYRUP','TERMIDOL SYRUP','General',1.00,2.00,'Box',142,0,'2025-12-24 08:13:54'),('P-1766564034119-554-lvwqm','TETMOSOL SOAP 100G','TETMOSOL SOAP 100G','General',1.00,1.00,'Box',328,0,'2025-12-24 08:13:54'),('P-1766564034119-555-ledxa','TETMOSOL SOAP 75G','TETMOSOL SOAP 75G','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-556-ok1i5','TETRACYCLINE CAP','TETRACYCLINE CAP','General',5.00,7.00,'Box',219,0,'2025-12-24 08:13:54'),('P-1766564034119-557-1sxrk','TETRACYCLINE EYE OINTMENT TUBE','TETRACYCLINE EYE OINTMENT TUBE','General',650.00,750.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-558-q1ve4','TETRACYCLINE SKIN OINTMENT TUBE','TETRACYCLINE SKIN OINTMENT TUBE','General',607.12,900.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-559-50fmv','TIMOLOL EYE DROP','TIMOLOL EYE DROP','General',1.00,2.00,'Box',296,0,'2025-12-24 08:13:54'),('P-1766564034119-560-pdf4t','TINIDAZOLE TABS 4S PACKET','TINIDAZOLE TABS 4S PACKET','General',252.67,400.00,'Box',3,0,'2025-12-24 08:13:54'),('P-1766564034119-561-0d250','TIZANIDINE TABS','TIZANIDINE TABS','General',4.00,5.00,'Box',7,0,'2025-12-24 08:13:54'),('P-1766564034119-562-5ouhc','TOFFPLUS CAPS 20s PACKET','TOFFPLUS CAPS 20s PACKET','General',3.00,4.00,'Box',47,0,'2025-12-24 08:13:54'),('P-1766564034119-563-wm3yl','TOSSIL','TOSSIL','General',1.00,1.00,'Box',140,0,'2025-12-24 08:13:54'),('P-1766564034119-564-j63e6','TOTOLYN SYRUP','TOTOLYN SYRUP','General',1.00,1.00,'Box',204,0,'2025-12-24 08:13:54'),('P-1766564034119-565-cvdld','TRAMADOL CAP','TRAMADOL CAP','General',4.00,5.00,'Box',93,0,'2025-12-24 08:13:54'),('P-1766564034119-566-ujmwd','TRAMADOL INJ','TRAMADOL INJ','General',858.26,1.00,'Box',511,0,'2025-12-24 08:13:54'),('P-1766564034119-567-y1kyc','TRANEXAMIC ACID INJ','TRANEXAMIC ACID INJ','General',1.00,1.00,'Box',50,0,'2025-12-24 08:13:54'),('P-1766564034119-568-4uxhp','TRANEXAMIC ACID TABS','TRANEXAMIC ACID TABS','General',5.00,7.00,'Box',59,0,'2025-12-24 08:13:54'),('P-1766564034119-569-x1jrf','TRIAMCINOLONE INJECTION','TRIAMCINOLONE INJECTION','General',2.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-570-5pcd4','TRUSTLY /FLEX P/ FAMILIA COC TA','TRUSTLY /FLEX P/ FAMILIA COC TA','General',655.89,900.00,'Box',186,0,'2025-12-24 08:13:54'),('P-1766564034119-571-8437r','UPT PACKET','UPT PACKET','General',93.78,150.00,'Box',18,0,'2025-12-24 08:13:54'),('P-1766564034119-572-jrmkj','URINE BAG','URINE BAG','General',550.00,750.00,'Box',230,0,'2025-12-24 08:13:54'),('P-1766564034119-573-9sqxr','VASELINE JELLY 95MLS','VASELINE JELLY 95MLS','General',2.00,3.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-574-8ikdu','VASOGRAIN TAB','VASOGRAIN TAB','General',4.00,5.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-575-6sd7n','VICRY NO. 2','VICRY NO. 2','General',2.00,2.00,'Box',52,0,'2025-12-24 08:13:54'),('P-1766564034119-576-vcx7c','VIGOMAX FORTE TAB','VIGOMAX FORTE TAB','General',8.00,11.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-577-kyjvu','VIGOR DOCTOR  100G','VIGOR DOCTOR  100G','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-578-m5cag','VIRUTUBISHO','VIRUTUBISHO','General',0.00,4.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-579-xbztn','VISKING HERBAL SYRUP','VISKING HERBAL SYRUP','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-580-tmlse','VISKING LOZENGES','VISKING LOZENGES','General',15.00,17.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-581-ll6u6','VISKING RUBB KUBWA 25G','VISKING RUBB KUBWA 25G','General',666.00,800.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-582-ifeiv','VISKING RUBB NDOGO 4GM','VISKING RUBB NDOGO 4GM','General',167.00,250.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-583-0b9co','VITAMIN B INJECTION','VITAMIN B INJECTION','General',1.00,1.00,'Box',8,0,'2025-12-24 08:13:54'),('P-1766564034119-584-wez73','VITAMIN B SYRUP 100ML BOTTLE','VITAMIN B SYRUP 100ML BOTTLE','General',950.00,1.00,'Box',7,0,'2025-12-24 08:13:54'),('P-1766564034119-585-0yxat','VITAMIN B TAB BLISTER','VITAMIN B TAB BLISTER','General',1.00,1.00,'Box',296,0,'2025-12-24 08:13:54'),('P-1766564034119-586-eixha','VITAMIN C TAB BLISTER','VITAMIN C TAB BLISTER','General',6.00,9.00,'Box',143,0,'2025-12-24 08:13:54'),('P-1766564034119-587-yfdwr','VITAMIN D3 5000IU','VITAMIN D3 5000IU','General',4.00,8.00,'Box',6,0,'2025-12-24 08:13:54'),('P-1766564034119-588-ttxq9','VITAMIN K INJECTION.','VITAMIN K INJECTION.','General',4.00,6.00,'Box',46,0,'2025-12-24 08:13:54'),('P-1766564034119-589-22li2','VIVIAN GEL TUBE','VIVIAN GEL TUBE','General',3.00,3.00,'Box',99,0,'2025-12-24 08:13:54'),('P-1766564034119-590-4ok1s','VIVIAN PLUS TAB PKT','VIVIAN PLUS TAB PKT','General',6.00,7.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-591-w92cb','VOLIN GEL TUBE','VOLIN GEL TUBE','General',1.00,3.00,'Box',65,0,'2025-12-24 08:13:54'),('P-1766564034119-592-imb01','VOMIDOXINE TAB','VOMIDOXINE TAB','General',2.00,2.00,'Box',25,0,'2025-12-24 08:13:54'),('P-1766564034119-593-g79ve','WATER FOR INJ 10ML VIAL','WATER FOR INJ 10ML VIAL','General',71.40,100.00,'Box',1,0,'2025-12-24 08:13:54'),('P-1766564034119-594-ictwg','WATER GUARD TAB','WATER GUARD TAB','General',0.00,6.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-595-ug3h8','WHITEFIELD KOPO','WHITEFIELD KOPO','General',650.00,750.00,'Box',15,0,'2025-12-24 08:13:54'),('P-1766564034119-596-xttto','WHITEFIELD OINTMENT TUBE','WHITEFIELD OINTMENT TUBE','General',598.32,750.00,'Box',361,0,'2025-12-24 08:13:54'),('P-1766564034119-597-743cc','XYLOMETAZOLINE NASAL DROPS','XYLOMETAZOLINE NASAL DROPS','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-598-dbvpz','ZECUF LOZENGES 2s','ZECUF LOZENGES 2s','General',2.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-599-4w9nx','ZECUF SYRUP BOTTLE','ZECUF SYRUP BOTTLE','General',1.00,2.00,'Box',376,0,'2025-12-24 08:13:54'),('P-1766564034119-600-jzb30','ZENDEX TAB','ZENDEX TAB','General',5.00,5.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-601-x3h69','ZENKOF SYRUP BOTTLE','ZENKOF SYRUP BOTTLE','General',2.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-602-an7ws','ZENTEL SYRUP','ZENTEL SYRUP','General',4.00,4.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-603-mf5sw','ZENTEL TAB PACKET','ZENTEL TAB PACKET','General',4.00,5.00,'Box',65,0,'2025-12-24 08:13:54'),('P-1766564034119-604-zerhz','ZENTUSS SYRUP 100ML BOTTLE','ZENTUSS SYRUP 100ML BOTTLE','General',1.00,2.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-605-0opel','ZENYLIN SYRUP BOTTLE','ZENYLIN SYRUP BOTTLE','General',2.00,2.00,'Box',109,0,'2025-12-24 08:13:54'),('P-1766564034119-606-5s3sk','ZOA ZOA NDOGO','ZOA ZOA NDOGO','General',500.00,550.00,'Box',10,0,'2025-12-24 08:13:54'),('P-1766564034119-607-q48za','ZOAZOA SOAP','ZOAZOA SOAP','General',1.00,1.00,'Box',10,0,'2025-12-24 08:13:54');
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_items`
--

LOCK TABLES `sale_items` WRITE;
/*!40000 ALTER TABLE `sale_items` DISABLE KEYS */;
INSERT INTO `sale_items` VALUES (1,'SALE-INV-1766590186287-4rphml9uh','P-1766564034117-0-4abzr',1,55.00,40.00,'BATCH-AUTO');
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
INSERT INTO `sales` VALUES ('SALE-INV-1766590186287-4rphml9uh','BR002',64.90,24.90,'CASH','JOHN KACHE','2025-12-24 15:40:27');
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
  `status` enum('PENDING','APPROVED','REJECTED','IN_TRANSIT','DELIVERED') DEFAULT 'PENDING',
  `verification_code` varchar(10) DEFAULT NULL,
  `total_value` decimal(15,2) DEFAULT NULL,
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
INSERT INTO `staff` VALUES ('ADMIN-001','System Administrator','SUPER_ADMIN','BR003',NULL,NULL,'ACTIVE','admin','$2y$10$.kJk4I3oKIy7rxo5IKcmrePl4R82CxUQdZNVF/ONM18fZNoprFWwi','2025-12-16 16:07:44','2025-12-24 13:35:34'),('ST-1766414748420','jaden','DISPENSER','BR004','jaden@gmail.com','+2456809876','INACTIVE','jaden','$2y$10$49.lu/IU2JcuUOHWtbkTJ.5PGjRlahtjC8M/LGoE/FzQefD0L4gg6','2025-12-22 14:45:49','2025-12-22 14:46:21'),('ST-1766415921685','rasul','STOREKEEPER','BR002','rasul@gmail.com','+3456783456','ACTIVE','rasul','$2y$10$3rK18Dba7saQxaiNXSmvl.xGQqCUWuhRRR.Bn2oC4SZDwjp0s2woa','2025-12-22 15:05:23','2025-12-24 16:53:18'),('ST-1766416049122','john','DISPENSER','BR005','john@gmail.com','+234567822','INACTIVE','john','$2y$10$OQdxJPdW9/xqCZC/zQB92e.z3Ppx8pQNxLdhRw6yQ/miMACODmtC6','2025-12-22 15:07:29','2025-12-22 15:08:46'),('ST-1766416829096','ema','DISPENSER','BR002','ema@gmail.com','+345678765','ACTIVE','ema','$2y$10$jkLrS12Ct3BfUJ3jeUBGYOD.d4jexpQPJdZ0vwyEKqVQqUOdrBZUW','2025-12-22 15:20:30','2025-12-24 15:52:47'),('ST-1766417527098','diana','INVENTORY_CONTROLLER','BR002','diana@gmail.com','+25566546784','ACTIVE','diana','$2y$10$PTK5PJI7hHB7/1BZn4y0O./Bvq4MRLqyaHiU88THkfWeTKYeEBecO','2025-12-22 15:32:07','2025-12-24 16:52:39'),('ST-1766417750243','an','STOREKEEPER','HEAD_OFFICE','','','INACTIVE','anna','$2y$10$T4SnvKXGPorWAOMOaAOCkeWMdm7eaMbMAEgNSvU3.E1MzcdCr9OJm','2025-12-22 15:35:50','2025-12-22 16:23:43'),('ST-1766418724156','rosemary','INVENTORY_CONTROLLER','HEAD_OFFICE','rosemary@gmail.com','+255344377','INACTIVE','rosemary','$2y$10$epk4si5eBHizFIH7SEAHXOlNOo3kM12hzrkBWJr4W1ZkL8ejVEVsG','2025-12-22 15:52:05',NULL),('ST-1766420586934','PAULO IDDI','BRANCH_MANAGER','BR003','pauloiddi@pms.co.tz','+255 762 399 731','ACTIVE','paulo_iddI','$2y$10$Rp8isWK16ABXeF2Cyni71eGZ4KiQKUUQFX43OEbupdrzmyWVGj0P2','2025-12-22 16:23:11','2025-12-22 16:54:17'),('ST-1766420992720','SAULO BURTON','PHARMACIST','BR003','sauloburton@pms.co.tz','+255 757 925 439','ACTIVE','sauloburton','$2y$10$Kt8nqgiQTh9iM3812iI6X.VscNfI1NKPIyaD1rjPwr6xmvrpTSwhG','2025-12-22 16:29:56',NULL),('ST-1766421883505','ISAYA PAUL','STOREKEEPER','BR003','isayapaul@pms.co.tz','+255 782 734 145','ACTIVE','isaya_paul','$2y$10$jezrnNHzLLCEQfTg7RynHOv7NFpEROr7xqfeGLuoElmJstDbQEALC','2025-12-22 16:44:47',NULL),('ST-1766422363512','AIKA JIDEGA','STOREKEEPER','BR003','aikajidega@pms.co.tz','+255 759 672 542','ACTIVE','aikajidega','$2y$10$7qbmqV2UCts0rnXhNUh0U.cN3w.HbP6LwOpNs.c0lflRbFFvdntYi','2025-12-22 16:52:47',NULL),('ST-1766424156482','SALMIN MIKIDAD','DISPENSER','BR002','salminmikidad@pms.co.tz','+255 719 050 805','ACTIVE','salmin_mikidad','$2y$10$XAehoNnxnJCJtAO0Jye5v.7/BYTcuP7pVpOJhRF0dUpXMSZ95owwK','2025-12-22 17:22:40',NULL),('ST-1766479861631','JOHN MAISHA','PHARMACIST','BR004','johm.maisha@pms.co.tz','+255 672 654 237','ACTIVE','johnmaisha','$2y$10$Ax6iAhqgU379IYDPqAgO4OJIZRNIMp6riQke6wb5N9eGHH83rcqLi','2025-12-23 08:51:03',NULL),('ST-1766481424251','IBRAHIM JUNGA','DISPENSER','BR007','ibrahimjunga@pms.co.tz','+255 620 823 829','ACTIVE','ibrahim.junga','$2y$10$tBndmDHEFvr5kNrV5CBlJemazDZG8stUyJM2lvhJs8l1WNtCo01iq','2025-12-23 09:17:05',NULL),('ST-1766565390183','abdala','ACCOUNTANT','BR002','abdala@gmail.com','+87654323','ACTIVE','abdala','$2y$10$p601yZFiyaaNInP7r1L/fuHGgtw1Dnlo9vUh00K0K0AEfbvL3s73.','2025-12-24 08:36:30','2025-12-24 16:51:25'),('ST-1766566046864','kache','DISPENSER','BR003','kache@gmail.com','+234567899','ACTIVE','kache','$2y$10$/VkaasKGrK5reaMK87OHKuQ5dmXGm7RyBI5zNvyeZ6yRgx5VYBHqS','2025-12-24 08:47:26','2025-12-24 09:35:31');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_requisition_items`
--

LOCK TABLES `stock_requisition_items` WRITE;
/*!40000 ALTER TABLE `stock_requisition_items` DISABLE KEYS */;
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
INSERT INTO `stock_requisitions` VALUES ('REQ-1766438521','BR005','ADMIN-001','APPROVED',1,'Stock requisition with 1 items','URGENT','2025-12-22 21:22:01','2025-12-24 09:34:22','ADMIN-001','2025-12-24 09:34:22'),('REQ-1766438531','BR005','ADMIN-001','APPROVED',1,'Stock requisition with 1 items','URGENT','2025-12-22 21:22:11','2025-12-24 09:34:20','ADMIN-001','2025-12-24 09:34:20'),('REQ-1766438541','BR005','ADMIN-001','APPROVED',1,'Stock requisition with 1 items','URGENT','2025-12-22 21:22:21','2025-12-24 09:34:15','ADMIN-001','2025-12-24 09:34:15'),('REQ-1766438547','BR005','ADMIN-001','APPROVED',1,'Stock requisition with 1 items','URGENT','2025-12-22 21:22:27','2025-12-24 09:34:14','ADMIN-001','2025-12-24 09:34:14'),('REQ-1766560100','BR005','ADMIN-001','APPROVED',1,'Stock requisition with 1 items','URGENT','2025-12-24 07:08:20','2025-12-24 09:34:14','ADMIN-001','2025-12-24 09:34:14'),('REQ-1766560108','BR005','ADMIN-001','APPROVED',1,'Stock requisition with 1 items','URGENT','2025-12-24 07:08:28','2025-12-24 09:34:10','ADMIN-001','2025-12-24 09:34:10'),('REQ-1766584179','BR002','ADMIN-001','APPROVED',2,'Stock requisition with 2 items','URGENT','2025-12-24 13:49:39','2025-12-24 13:57:41','ADMIN-001','2025-12-24 13:57:41'),('REQ-1766584379','BR002','ADMIN-001','APPROVED',2,'Stock requisition with 2 items','URGENT','2025-12-24 13:52:59','2025-12-24 13:57:40','ADMIN-001','2025-12-24 13:57:40'),('REQ-1766587672','BR003','ST-1766417527098','APPROVED',1,'Stock requisition with 1 items','URGENT','2025-12-24 14:47:52','2025-12-24 14:50:30','ADMIN-001','2025-12-24 14:50:30'),('REQ-1766588564','BR002','ST-1766417527098','APPROVED',1,'Stock requisition with 1 items','URGENT','2025-12-24 15:02:44','2025-12-24 15:03:31','ADMIN-001','2025-12-24 15:03:31'),('REQ-1766590753','BR002','ST-1766417527098','APPROVED',1,'Stock requisition with 1 items','URGENT','2025-12-24 15:39:13','2025-12-24 15:46:53','ADMIN-001','2025-12-24 15:46:53');
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
  `status` enum('IN_TRANSIT','COMPLETED','CANCELLED') DEFAULT 'IN_TRANSIT',
  `date_sent` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_received` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_transfers_from_branch` (`from_branch_id`),
  KEY `idx_transfers_to_branch` (`to_branch_id`),
  KEY `idx_transfers_status` (`status`),
  CONSTRAINT `stock_transfers_ibfk_1` FOREIGN KEY (`from_branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_transfers_ibfk_2` FOREIGN KEY (`to_branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_transfers`
--

LOCK TABLES `stock_transfers` WRITE;
/*!40000 ALTER TABLE `stock_transfers` DISABLE KEYS */;
INSERT INTO `stock_transfers` VALUES ('TRANSFER-1766566335','HEAD_OFFICE','BR002','[{\"productId\":\"P-1766564034117-0-4abzr\",\"productName\":\"ABDOMINAL BELT XXL\",\"quantity\":2333,\"batchNumber\":\"BATCH-1766566332917\",\"expiryDate\":\"2025-12-31\"}]','IN_TRANSIT','2025-12-24 08:52:15',NULL,'','ADMIN-001','2025-12-24 08:52:15','2025-12-24 08:52:15'),('TRANSFER-1766587667','BR003','BR002','[{\"productId\":\"P-1766564034117-1-kacpg\",\"productName\":\"ABITOL TABS 4MG\",\"quantity\":333,\"batchNumber\":\"BATCH-1766587660854\",\"expiryDate\":\"2025-12-31\"}]','IN_TRANSIT','2025-12-24 14:47:47',NULL,'','ADMIN-001','2025-12-24 14:47:47','2025-12-24 14:47:47'),('TRANSFER-1766588740','BR003','BR002','[{\"productId\":\"P-1766564034117-0-4abzr\",\"productName\":\"ABDOMINAL BELT XXL\",\"quantity\":300,\"batchNumber\":\"BATCH-1766588736817\",\"expiryDate\":\"2025-12-31\"}]','IN_TRANSIT','2025-12-24 15:05:40',NULL,'','ADMIN-001','2025-12-24 15:05:40','2025-12-24 15:05:40'),('TRANSFER-1766590375','BR003','BR002','[{\"productId\":\"P-1766564034117-1-kacpg\",\"productName\":\"ABITOL TABS 4MG\",\"quantity\":400,\"batchNumber\":\"BATCH-1766590372099\",\"expiryDate\":\"2025-12-31\"}]','IN_TRANSIT','2025-12-24 15:32:55',NULL,'','ADMIN-001','2025-12-24 15:32:55','2025-12-24 15:32:55'),('TRANSFER-1766592170','BR003','BR002','[{\"productId\":\"P-1766564034117-0-4abzr\",\"productName\":\"ABDOMINAL BELT XXL\",\"quantity\":30,\"batchNumber\":\"BATCH-1766592160441\",\"expiryDate\":\"2025-12-31\"}]','IN_TRANSIT','2025-12-24 16:02:50',NULL,'','ADMIN-001','2025-12-24 16:02:50','2025-12-24 16:02:50'),('TRANSFER-1766594906','BR003','BR002','[{\"productId\":\"P-1766564034117-2-bt597\",\"productName\":\"ACECLOFENAC TABS\",\"quantity\":200,\"batchNumber\":\"BATCH-1766594903638\",\"expiryDate\":\"2025-12-31\"}]','IN_TRANSIT','2025-12-24 16:48:26',NULL,'','ADMIN-001','2025-12-24 16:48:26','2025-12-24 16:48:26');
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
INSERT INTO `system_settings` VALUES ('address','general','address','P.O.BOX 2344, MPANDA','string','general address setting',NULL,'2025-12-24 15:48:41'),('apiKey','integrations','apiKey','sk_live_51Mk...90xZ','string','integrations apiKey setting',NULL,'2025-12-17 16:54:19'),('companyName','general','companyName','PMS Pharmacy Ltd','string','general companyName setting',NULL,'2025-12-24 15:48:41'),('currency','general','currency','TZS','string','general currency setting',NULL,'2025-12-24 15:48:41'),('dailyReportSms','notifications','dailyReportSms','false','string','notifications dailyReportSms setting',NULL,'2025-12-24 15:48:41'),('email','general','email','info@pms.co.tz','string','general email setting',NULL,'2025-12-24 15:48:41'),('emailRecipients','notifications','emailRecipients','admin@pms.co.tz, manager@pms.co.tz','string','notifications emailRecipients setting',NULL,'2025-12-24 15:48:41'),('enforceStrongPasswords','security','enforceStrongPasswords','true','string','security enforceStrongPasswords setting',NULL,'2025-12-24 15:48:41'),('expiryAlertSms','notifications','expiryAlertSms','true','string','notifications expiryAlertSms setting',NULL,'2025-12-24 15:48:41'),('language','general','language','English','string','general language setting',NULL,'2025-12-24 15:48:41'),('logo','general','logo','/backend_php/uploads/logos/logo_1766583525_694bece59ba8e.jpg','string','Company logo setting',NULL,'2025-12-24 15:48:41'),('lowStockEmail','notifications','lowStockEmail','true','string','notifications lowStockEmail setting',NULL,'2025-12-24 15:48:41'),('msdSyncEnabled','integrations','msdSyncEnabled','true','string','integrations msdSyncEnabled setting',NULL,'2025-12-24 15:48:41'),('nhifPortalId','integrations','nhifPortalId','HOSP-001-TZ','string','integrations nhifPortalId setting',NULL,'2025-12-24 15:48:41'),('passwordExpiry','security','passwordExpiry','90','string','security passwordExpiry setting',NULL,'2025-12-24 15:48:41'),('phone','general','phone','+255 700 123 456','string','general phone setting',NULL,'2025-12-24 15:48:41'),('sessionTimeout','security','sessionTimeout','15','string','security sessionTimeout setting',NULL,'2025-12-24 15:48:41'),('smsGateway','integrations','smsGateway','Twilio','string','integrations smsGateway setting',NULL,'2025-12-24 15:48:41'),('systemUpdates','notifications','systemUpdates','true','string','notifications systemUpdates setting',NULL,'2025-12-24 15:48:41'),('timezone','general','timezone','Africa/Dar_es_Salaam','string','general timezone setting',NULL,'2025-12-24 15:48:41'),('tinNumber','general','tinNumber','123-456-789','string','general tinNumber setting',NULL,'2025-12-24 15:48:41'),('traPortalUrl','integrations','traPortalUrl','http://localhost:8080/tra-api/v1','string','integrations traPortalUrl setting',NULL,'2025-12-24 15:48:41'),('twoFactor','security','twoFactor','true','string','security twoFactor setting',NULL,'2025-12-24 15:48:41'),('vrnNumber','general','vrnNumber','400-999-111','string','general vrnNumber setting',NULL,'2025-12-24 15:48:41');
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

-- Dump completed on 2025-12-24 19:55:16
