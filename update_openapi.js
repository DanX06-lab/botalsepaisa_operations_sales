const fs = require('fs');
const yaml = require('js-yaml');

const filePath = 'lib/api-spec/openapi.yaml';
let doc = yaml.load(fs.readFileSync(filePath, 'utf8'));

// Add schemas
const schemas = {
  CoverageOverview: {
    type: 'object',
    properties: {
      total: { type: 'number' },
      cafes: { type: 'number' },
      restaurants: { type: 'number' },
      verified: { type: 'number' },
      unverified: { type: 'number' },
      duplicates: { type: 'number' },
      unassigned: { type: 'number' }
    }
  },
  ZoneCoverage: {
    type: 'object',
    properties: {
      zone_id: { type: 'string' },
      total: { type: 'number' },
      cafes: { type: 'number' },
      restaurants: { type: 'number' },
      verified: { type: 'number' }
    }
  },
  AreaCoverage: {
    type: 'object',
    properties: {
      area_id: { type: 'string' },
      zone_id: { type: 'string' },
      total: { type: 'number' }
    }
  },
  WardCoverage: {
    type: 'object',
    properties: {
      ward_id: { type: 'string' },
      borough_id: { type: 'string' },
      total: { type: 'number' }
    }
  },
  BoroughCoverage: {
    type: 'object',
    properties: {
      borough_id: { type: 'string' },
      total: { type: 'number' }
    }
  },
  SourceCoverage: {
    type: 'object',
    properties: {
      source: { type: 'string' },
      total: { type: 'number' }
    }
  },
  QualityCoverage: {
    type: 'object',
    properties: {
      missing_coordinates: { type: 'number' },
      missing_address: { type: 'number' },
      missing_phone: { type: 'number' },
      missing_website: { type: 'number' },
      missing_rating: { type: 'number' },
      unassigned_zone_area: { type: 'number' }
    }
  }
};

Object.assign(doc.components.schemas, schemas);

const commonParams = [
  { name: 'zone_id', in: 'query', schema: { type: 'string' } },
  { name: 'area_id', in: 'query', schema: { type: 'string' } },
  { name: 'ward_id', in: 'query', schema: { type: 'string' } },
  { name: 'borough_id', in: 'query', schema: { type: 'string' } },
  { name: 'business_type', in: 'query', schema: { type: 'string' } },
  { name: 'verification_status', in: 'query', schema: { type: 'string' } },
  { name: 'source', in: 'query', schema: { type: 'string' } }
];

const paths = {
  '/intelligence/coverage/overview': {
    get: {
      operationId: 'getCoverageOverview',
      tags: ['intelligence'],
      summary: 'Get coverage overview',
      parameters: commonParams,
      responses: {
        '200': {
          description: 'Coverage overview',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CoverageOverview' } } }
        }
      }
    }
  },
  '/intelligence/coverage/zones': {
    get: {
      operationId: 'getZoneCoverage',
      tags: ['intelligence'],
      summary: 'Get coverage by zones',
      parameters: commonParams,
      responses: {
        '200': {
          description: 'Zone coverage',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ZoneCoverage' } } } }
        }
      }
    }
  },
  '/intelligence/coverage/areas': {
    get: {
      operationId: 'getAreaCoverage',
      tags: ['intelligence'],
      summary: 'Get coverage by areas',
      parameters: commonParams,
      responses: {
        '200': {
          description: 'Area coverage',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AreaCoverage' } } } }
        }
      }
    }
  },
  '/intelligence/coverage/wards': {
    get: {
      operationId: 'getWardCoverage',
      tags: ['intelligence'],
      summary: 'Get coverage by wards',
      parameters: commonParams,
      responses: {
        '200': {
          description: 'Ward coverage',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/WardCoverage' } } } }
        }
      }
    }
  },
  '/intelligence/coverage/boroughs': {
    get: {
      operationId: 'getBoroughCoverage',
      tags: ['intelligence'],
      summary: 'Get coverage by boroughs',
      parameters: commonParams,
      responses: {
        '200': {
          description: 'Borough coverage',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/BoroughCoverage' } } } }
        }
      }
    }
  },
  '/intelligence/coverage/sources': {
    get: {
      operationId: 'getSourceCoverage',
      tags: ['intelligence'],
      summary: 'Get coverage by sources',
      parameters: commonParams,
      responses: {
        '200': {
          description: 'Source coverage',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/SourceCoverage' } } } }
        }
      }
    }
  },
  '/intelligence/coverage/quality': {
    get: {
      operationId: 'getQualityCoverage',
      tags: ['intelligence'],
      summary: 'Get quality coverage metrics',
      parameters: commonParams,
      responses: {
        '200': {
          description: 'Quality coverage',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/QualityCoverage' } } }
        }
      }
    }
  }
};

Object.assign(doc.paths, paths);

fs.writeFileSync(filePath, yaml.dump(doc, { noRefs: true }));
