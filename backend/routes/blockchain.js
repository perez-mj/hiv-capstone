// backend/routes/blockchain.js
'use strict';

const express = require('express');

const router = express.Router();

const blockchainService =
  require('../services/blockchainService');

const auth =
  require('../middleware/auth');

const { roleCheck } =
  require('../middleware/roleCheck');


// ============================================================================
// BLOCKCHAIN STATUS
// ============================================================================

router.get(
  '/status',
  auth,
  roleCheck('admin'),

  async (req, res) => {

    try {

      const status =
        await blockchainService.getStatus(
          req.user.id,
          req
        );

      return res.json(status);

    } catch (error) {

      return res.status(500).json({
        error: error.message
      });
    }
  }
);


// ============================================================================
// CHAIN INFO
// ============================================================================

router.get(
  '/info',
  auth,
  roleCheck('admin'),

  async (req, res) => {

    try {

      const info =
        await blockchainService.getChainInfo(
          req.user.id,
          req
        );

      if (!info) {

        return res.status(503).json({
          ok: false,
          error: 'MultiChain node unavailable'
        });
      }

      return res.json(info);

    } catch (error) {

      return res.status(500).json({
        error: error.message
      });
    }
  }
);


// ============================================================================
// RECENT ON-CHAIN ITEMS
// ============================================================================

router.get(
  '/items',
  auth,
  roleCheck('admin'),

  async (req, res) => {

    try {

      const count = Math.min(
        Math.max(
          parseInt(req.query.count, 10) || 20,
          1
        ),
        200
      );


      const verbose =
        req.query.verbose === 'true';


      const items =
        await blockchainService.listRecentItems(
          count,
          verbose,
          req.user.id,
          req
        );


      return res.json(items);

    } catch (error) {

      return res.status(500).json({
        error: error.message
      });
    }
  }
);


// ============================================================================
// VERIFY SINGLE TXID
// ============================================================================

router.get(
  '/verify/:txid',
  auth,
  roleCheck('admin'),

  async (req, res) => {

    try {

      const result =
        await blockchainService.verify(
          req.params.txid,
          null,
          req.user.id,
          req
        );


      if (!result.found) {

        return res.status(404).json(
          result
        );
      }


      return res.json(result);

    } catch (error) {

      return res.status(500).json({
        error: error.message
      });
    }
  }
);


// ============================================================================
// VERIFY PATIENT AGAINST BLOCKCHAIN
// ============================================================================
//
// Staff and admins can verify a patient.
//
// Example:
// GET /api/blockchain/verify/patient/123
//
// ============================================================================

router.get(
  '/verify/patient/:patientId',
  auth,
  roleCheck('admin', 'staff'),

  async (req, res) => {

    try {

      const patientId =
        Number.parseInt(
          req.params.patientId,
          10
        );


      if (
        !Number.isInteger(patientId) ||
        patientId <= 0
      ) {

        return res.status(400).json({
          error: 'Invalid patient ID'
        });
      }


      const result =
        await blockchainService
          .verifyPatientAgainstChain(
            patientId,
            req.user.id,
            req
          );


      if (!result.found) {

        return res.status(404).json(
          result
        );
      }


      return res.json(result);

    } catch (error) {

      return res.status(500).json({
        error: error.message
      });
    }
  }
);


module.exports = router;