import { ElementRef } from 'react';
import classNames from '@/styles/tasks.module.scss';
import { useGetAllTasksQuery } from '@/app/services/tasksApi';
import { TABS, Tab, TabTasksData } from '@/interfaces/task.type';
import { useState, useEffect, useRef } from 'react';
import {
    NO_TASKS_FOUND_MESSAGE,
    TASKS_FETCH_ERROR_MESSAGE,
} from '../../constants/messages';
import { TabSection } from './TabSection';
import TaskList from './TaskList/TaskList';
import { useRouter } from 'next/router';
import { getActiveTab, tabToUrlParams } from '@/utils/getActiveTab';

import { Select } from '../Select';
import { getChangedStatusName } from '@/utils/getChangedStatusName';
import useIntersection from '@/hooks/useIntersection';
import TaskSearch from './TaskSearch/TaskSearch';

const getQueryParamValue = (tab: Tab) => `is:${tabToUrlParams(tab)}`;

export const TasksContent = ({ dev }: { dev: boolean }) => {
    const router = useRouter();
    const allQueryParams = router.query;
    const qQueryParam = allQueryParams.q as string;
    const queryTab = qQueryParam?.replace('is:', '');
    const selectedTab = getActiveTab(queryTab);
    const [nextTasks, setNextTasks] = useState<string>('');
    const [loadedTasks, setLoadedTasks] = useState<TabTasksData>({
        IN_PROGRESS: [],
        ASSIGNED: [],
        AVAILABLE: [],
        NEEDS_REVIEW: [],
        IN_REVIEW: [],
        VERIFIED: [],
        MERGED: [],
        COMPLETED: [],
    });
    const loadingRef = useRef<ElementRef<'div'>>(null);
    const [inputValue, setInputValue] = useState<string>(
        getQueryParamValue(selectedTab)
    );

    const {
        data: tasksData = { tasks: [], next: '' },
        isError,
        isLoading,
        isFetching,
    } = useGetAllTasksQuery({
        status: selectedTab,
        nextTasks,
    });

    const fetchMoreTasks = () => {
        if (tasksData.next) {
            setNextTasks(tasksData.next);
        }
    };
    const onSelect = (tab: Tab) => {
        const queryParamValue = getQueryParamValue(tab);
        router.push({
            query: {
                ...router.query,
                q: queryParamValue,
            },
        });
        setNextTasks('');
        setInputValue(queryParamValue);
    };

    useEffect(() => {
        if (tasksData.tasks && tasksData.tasks.length && !isFetching) {
            const newTasks: TabTasksData = JSON.parse(
                JSON.stringify(loadedTasks)
            );
            newTasks[selectedTab] = newTasks[selectedTab].filter(
                (task) =>
                    !tasksData.tasks.some((newTask) => newTask.id === task.id)
            );

            newTasks[selectedTab].push(...tasksData.tasks);

            setLoadedTasks(newTasks);
        }
    }, [tasksData.tasks, selectedTab]);

    useIntersection({
        loadingRef,
        onLoadMore: fetchMoreTasks,
        earlyReturn: loadedTasks[selectedTab].length === 0,
    });

    if (isLoading) return <p>Loading...</p>;

    if (isError) return <p>{TASKS_FETCH_ERROR_MESSAGE}</p>;

    const taskSelectOptions = TABS.map((item) => ({
        label: getChangedStatusName(item),
        value: item,
    }));

    const searchButtonHandler = () => {
        inputValue && onSelect(getActiveTab(inputValue.replace('is:', '')));
    };

    return (
        <div className={classNames.tasksContainer}>
            {dev && (
                <TaskSearch
                    onSelect={onSelect}
                    inputValue={inputValue}
                    activeTab={selectedTab}
                    onInputChange={(value) => setInputValue(value)}
                    onClickSearchButton={searchButtonHandler}
                />
            )}
            <div
                className={classNames['status-tabs-container']}
                data-testid="status-tabs-container"
            >
                <TabSection onSelect={onSelect} activeTab={selectedTab} />
            </div>
            <div
                className={classNames['status-select-container']}
                data-testid="status-select-container"
            >
                <Select
                    value={{
                        label: getChangedStatusName(selectedTab),
                        value: selectedTab,
                    }}
                    onChange={(selectedTaskStatus) => {
                        if (selectedTaskStatus) {
                            onSelect(selectedTaskStatus.value as Tab);
                        }
                    }}
                    options={taskSelectOptions}
                />
            </div>
            <div>
                {loadedTasks[selectedTab] && loadedTasks[selectedTab].length ? (
                    <TaskList tasks={loadedTasks[selectedTab]} />
                ) : (
                    !isFetching && <p>{NO_TASKS_FOUND_MESSAGE}</p>
                )}
            </div>

            <div ref={loadingRef}>{isFetching && 'Loading...'}</div>
        </div>
    );
};
