import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { ProjectListComponent } from './project-list.component';

describe('ProjectListComponent', () => {
  const fb = new FormBuilder();

  const makeServices = () => {
    const projectService = {
      getProjects: jest.fn().mockReturnValue(of([])),
      createProject: jest.fn().mockReturnValue(of({ id: 'p1' })),
      updateProject: jest.fn().mockReturnValue(of({ id: 'p1' })),
    };
    const authService = {
      getCurrentUser: jest.fn().mockReturnValue({ id: 1 }),
    };
    return { projectService, authService };
  };

  it('does not allow non-owners to edit a project', () => {
    const { projectService, authService } = makeServices();
    const component = new ProjectListComponent(
      projectService as never,
      authService as never,
      fb,
    );

    expect(component.canEditProject({ ownerId: 2 } as never)).toBe(false);
  });

  it('allows owners to edit their own projects', () => {
    const { projectService, authService } = makeServices();
    const component = new ProjectListComponent(
      projectService as never,
      authService as never,
      fb,
    );

    expect(component.canEditProject({ ownerId: 1 } as never)).toBe(true);
    expect(component.canEditProject({ ownerId: 2 } as never)).toBe(false);
  });

  it('creates a project with parsed client emails', () => {
    const { projectService, authService } = makeServices();
    const component = new ProjectListComponent(
      projectService as never,
      authService as never,
      fb,
    );
    jest.spyOn(component, 'loadProjects').mockImplementation(() => undefined);

    component.projectForm.setValue({
      title: 'Project A',
      description: 'Demo',
      clientEmails: 'a@example.com\n b@example.com ',
    });

    component.onSubmit();

    expect(projectService.createProject).toHaveBeenCalledWith({
      title: 'Project A',
      description: 'Demo',
      clientEmails: ['a@example.com', 'b@example.com'],
    });
  });

  it('updates current editing project', () => {
    const { projectService, authService } = makeServices();
    const component = new ProjectListComponent(
      projectService as never,
      authService as never,
      fb,
    );
    jest.spyOn(component, 'loadProjects').mockImplementation(() => undefined);
    component.editingProject = { id: 'p1' } as never;
    component.projectForm.setValue({
      title: 'Updated',
      description: '',
      clientEmails: '',
    });

    component.onSubmit();

    expect(projectService.updateProject).toHaveBeenCalledWith('p1', {
      title: 'Updated',
      description: undefined,
      clientEmails: [],
    });
  });
});
