import { ContensisForm } from '@contensis/forms';
import type { FormProps } from '@contensis/forms';
import { PUBLIC_PROJECT } from 'astro:env/client';

interface IFormComponentProps extends Partial<FormProps> {
  formId: string | undefined;
  projectId?: string;
}

const Form = ({ formId, projectId, ...rest }: IFormComponentProps) => {
  if (!formId) return null;
  return (
    <ContensisForm
      formId={formId}
      projectId={projectId || PUBLIC_PROJECT}
      onPopulate={defaultValue => {
        if ('emailAddress' in defaultValue) {
          defaultValue.emailAddress = '@zengenti.com';
        }
        return defaultValue;
      }}
      onLoadError={error => {
        console.error(error);
      }}
      onSubmit={response => {
        console.info(response);
        return response;
      }}
      onSubmitSuccess={response => {
        console.info(response);
        return true;
      }}
      onSubmitError={error => {
        console.error(error);
        return true;
      }}
      error={
        formId !== '~invalid-form~'
          ? undefined
          : (e: unknown) => (
              <>
                <h2>Custom error component</h2>
                <p>{(e as Error).message}</p>
                <pre>{JSON.stringify(e, null, 2)}</pre>
              </>
            )
      }
      {...rest}
    />
  );
};

export default Form;
