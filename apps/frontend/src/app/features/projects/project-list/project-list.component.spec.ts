import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { ProjectListComponent } from './project-list.component';

describe('ProjectListComponent', () => {
  const fb = new FormBuilder();

  const makeServices = (isAdmin = false) => {
    const projectService = {
      getProjects: jest.fn().mockReturnValue(of([])),
      createProject: jest.fn().mockReturnValue(of({ id: 'p1' })),
      updateProject: jest.fn().mockReturnValue(of({ id: 'p1' })),
    };
    const authService = {
      isAdmin: jest.fn().mockReturnValue(isAdmin),
      getCurrentUser: jest.fn().mockReturnValue({ id: 'u1' }),
    };
    return { projectService, authService };
  };

  it('allows admin users to edit any project', () => {
    const { projectService, authService } = makeServices(true);
    const component = new ProjectListComponent(
      projectService as never,
      authService as never,
      fb,
    );

    expect(component.canEditProject({ ownerId: 'someone-else' } as never)).toBe(true);
  });

  it('allows owners to edit their own projects', () => {
    const { projectService, authService } = makeServices(false);
    const component = new ProjectListComponent(
      projectService as never,
      authService as never,
      fb,
    );

    expect(component.canEditProject({ ownerId: 'u1' } as never)).toBe(true);
    expect(component.canEditProject({ ownerId: 'u2' } as never)).toBe(false);
  });

  it('creates a project with parsed client emails', () => {
    const { projectService, authService } = makeServices(false);
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
    const { projectService, authService } = makeServices(false);
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
