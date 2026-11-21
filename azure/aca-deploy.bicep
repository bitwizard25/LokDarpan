@description('Location for all resources')
param location string = resourceGroup().location

@description('Name of the Container Apps Environment')
param environmentName string = 'lokdarpan-env'

@description('Name of the Azure Container App')
param appName string = 'lokdarpan-api'

@description('Container image from GitHub Container Registry (ghcr.io) or Docker Hub')
param containerImage string = 'ghcr.io/rajbhoyar729/lokdarpan-backend:latest'

@description('Port exposed by the Fastify backend container')
param targetPort int = 5000

@description('MongoDB / Azure Cosmos DB connection URI')
@secure()
param mongoUri string

@description('Database name')
param dbName string = 'lokdarpan'

@description('JWT Secret Key for authentication')
@secure()
param jwtSecret string

@description('AWS / S3-compatible Access Key ID')
@secure()
param awsAccessKeyId string = ''

@description('AWS / S3-compatible Secret Access Key')
@secure()
param awsSecretAccessKey string = ''

@description('S3 Bucket Name')
param s3BucketName string = ''

@description('AWS Region')
param awsRegion string = 'ap-south-1'

@description('Optional S3-compatible custom endpoint (Cloudflare R2, MinIO, etc.)')
param s3Endpoint string = ''

@description('Optional public storage CDN URL (e.g. https://cdn.example.com)')
param storagePublicUrl string = ''

@description('Optional Redis URL (e.g. Upstash Serverless Redis or internal container redis)')
@secure()
param redisUrl string = 'redis://127.0.0.1:6379'

@description('Secret token for Azure Functions / cron jobs')
@secure()
param cronSecret string = ''

// Container Apps Managed Environment
resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  properties: {
    zoneRedundant: false
  }
}

// Container App (Free-tier friendly: 0.25 vCPU, 0.5 GiB memory, scales to 0 when idle)
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: true
        targetPort: targetPort
        transport: 'auto'
        allowInsecure: false
      }
      secrets: [
        {
          name: 'mongo-uri'
          value: mongoUri
        }
        {
          name: 'jwt-secret'
          value: jwtSecret
        }
        {
          name: 'aws-access-key-id'
          value: awsAccessKeyId
        }
        {
          name: 'aws-secret-access-key'
          value: awsSecretAccessKey
        }
        {
          name: 'redis-url'
          value: redisUrl
        }
        {
          name: 'cron-secret'
          value: cronSecret
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: containerImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: string(targetPort)
            }
            {
              name: 'HOST'
              value: '0.0.0.0'
            }
            {
              name: 'DB_NAME'
              value: dbName
            }
            {
              name: 'AWS_REGION'
              value: awsRegion
            }
            {
              name: 'S3_BUCKET_NAME'
              value: s3BucketName
            }
            {
              name: 'S3_ENDPOINT'
              value: s3Endpoint
            }
            {
              name: 'STORAGE_PUBLIC_URL'
              value: storagePublicUrl
            }
            {
              name: 'MONGO_URI'
              secretRef: 'mongo-uri'
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'AWS_ACCESS_KEY_ID'
              secretRef: 'aws-access-key-id'
            }
            {
              name: 'AWS_SECRET_ACCESS_KEY'
              secretRef: 'aws-secret-access-key'
            }
            {
              name: 'REDIS_URL'
              secretRef: 'redis-url'
            }
            {
              name: 'CRON_SECRET'
              secretRef: 'cron-secret'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: targetPort
              }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: targetPort
              }
              initialDelaySeconds: 5
              periodSeconds: 15
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0 // Scales to 0 when idle to stay within the free tier grant
        maxReplicas: 2
        rules: [
          {
            name: 'http-rule'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

output appFqdn string = containerApp.properties.configuration.ingress.fqdn
output apiUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
