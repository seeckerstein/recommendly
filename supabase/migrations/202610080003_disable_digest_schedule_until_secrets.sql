-- Do not leave a scheduled delivery active until the production Vault values
-- and matching Edge Function secret have been provisioned and verified.
select cron.unschedule(jobid)
from cron.job
where jobname = 'weekly-recommendations-email';
